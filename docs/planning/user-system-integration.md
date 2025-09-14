# User System Integration Design

## Overview
This document outlines how the family tree application integrates user authentication and authorization to provide secure, isolated family tree management for multiple users.

## User Authentication Architecture

### Authentication Flow
1. **Registration**: New users create accounts with email verification
2. **Login**: Users authenticate with email/password using Laravel Sanctum
3. **Token Management**: JWT-like tokens for API authentication
4. **Session Management**: Server-side session tracking for security
5. **Logout**: Token revocation and session cleanup

### User Model Enhancement
```php
// app/Models/User.php
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'preferred_language',
        'timezone',
        'date_format',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Relationships
    public function familyTrees(): HasMany
    {
        return $this->hasMany(FamilyTree::class);
    }

    public function sharedTrees(): BelongsToMany
    {
        return $this->belongsToMany(FamilyTree::class, 'shared_trees', 'shared_with_user_id', 'family_tree_id')
            ->withPivot(['permission_level', 'shared_by_user_id', 'is_active'])
            ->withTimestamps();
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    // Helper methods
    public function canAccessTree(string $treeId): bool
    {
        return $this->familyTrees()->where('id', $treeId)->exists() ||
               $this->sharedTrees()->where('family_tree_id', $treeId)
                   ->wherePivot('is_active', true)->exists();
    }

    public function getTreePermission(string $treeId): ?string
    {
        // Owner has admin permission
        if ($this->familyTrees()->where('id', $treeId)->exists()) {
            return 'admin';
        }

        // Check shared permission
        $sharedTree = $this->sharedTrees()
            ->where('family_tree_id', $treeId)
            ->wherePivot('is_active', true)
            ->first();

        return $sharedTree?->pivot?->permission_level;
    }
}
```

## Data Isolation Strategy

### 1. Model-Level Isolation
Every family tree related model includes user/tree filtering:

```php
// app/Models/FamilyTree.php
class FamilyTree extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'root_person_id',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    protected static function booted()
    {
        // Automatically set user_id when creating
        static::creating(function ($tree) {
            if (!$tree->user_id) {
                $tree->user_id = auth()->id();
            }
        });

        // Auto-generate UUID
        static::creating(function ($tree) {
            if (!$tree->id) {
                $tree->id = (string) Str::uuid();
            }
        });

        // Global scope for user isolation
        static::addGlobalScope('userScope', function (Builder $builder) {
            if (auth()->check()) {
                $builder->where('user_id', auth()->id());
            }
        });
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }

    public function relationships(): HasMany
    {
        return $this->hasMany(Relationship::class);
    }

    public function sharedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'shared_trees', 'family_tree_id', 'shared_with_user_id')
            ->withPivot(['permission_level', 'shared_by_user_id', 'is_active', 'expires_at'])
            ->withTimestamps();
    }
}

// app/Models/Person.php
class Person extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'family_tree_id',
        'first_name',
        'last_name',
        'maiden_name',
        'nickname',
        'gender',
        'birth_date',
        'death_date',
        'birth_place',
        'death_place',
        'father_id',
        'mother_id',
        'photo_path',
        'notes',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'death_date' => 'date',
    ];

    protected static function booted()
    {
        // Auto-generate UUID
        static::creating(function ($person) {
            if (!$person->id) {
                $person->id = (string) Str::uuid();
            }
        });

        // Ensure person belongs to user's tree
        static::creating(function ($person) {
            $tree = FamilyTree::find($person->family_tree_id);
            if (!$tree || $tree->user_id !== auth()->id()) {
                throw new UnauthorizedException('Cannot add person to this tree');
            }
        });
    }

    // Scope to filter by tree access
    public function scopeAccessibleByUser(Builder $query, User $user): Builder
    {
        return $query->whereHas('familyTree', function ($treeQuery) use ($user) {
            $treeQuery->where('user_id', $user->id)
                     ->orWhereHas('sharedUsers', function ($sharedQuery) use ($user) {
                         $sharedQuery->where('users.id', $user->id)
                                   ->wherePivot('is_active', true);
                     });
        });
    }
}
```

### 2. Controller-Level Authorization
```php
// app/Http/Controllers/FamilyTreeController.php
class FamilyTreeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        
        $trees = $user->familyTrees()
            ->withCount('people')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('updated_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $trees->items(),
            'meta' => [
                'current_page' => $trees->currentPage(),
                'last_page' => $trees->lastPage(),
                'per_page' => $trees->perPage(),
                'total' => $trees->total(),
            ],
        ]);
    }

    public function show(Request $request, string $treeId)
    {
        $user = $request->user();
        
        // Check if user can access this tree
        if (!$user->canAccessTree($treeId)) {
            return response()->json([
                'success' => false,
                'message' => 'Tree not found or access denied',
            ], 404);
        }

        $tree = FamilyTree::withoutGlobalScope('userScope')
            ->with(['people' => function ($query) {
                $query->select(['id', 'family_tree_id', 'first_name', 'last_name']);
            }])
            ->find($treeId);

        return response()->json([
            'success' => true,
            'data' => $tree,
        ]);
    }

    public function store(StoreFamilyTreeRequest $request)
    {
        $tree = FamilyTree::create([
            'name' => $request->name,
            'description' => $request->description,
            'user_id' => $request->user()->id,
            'settings' => $request->settings ?? [],
        ]);

        return response()->json([
            'success' => true,
            'data' => $tree,
            'message' => 'Family tree created successfully',
        ], 201);
    }
}

// app/Http/Controllers/PersonController.php
class PersonController extends Controller
{
    public function store(StorePersonRequest $request, string $treeId)
    {
        // Verify tree access
        if (!$request->user()->canAccessTree($treeId)) {
            return response()->json([
                'success' => false,
                'message' => 'Tree not found or access denied',
            ], 404);
        }

        // Check permission level
        $permission = $request->user()->getTreePermission($treeId);
        if (!in_array($permission, ['admin', 'edit'])) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient permissions to add people',
            ], 403);
        }

        $person = Person::create([
            'family_tree_id' => $treeId,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            // ... other fields
        ]);

        // Log the activity
        ActivityLog::create([
            'family_tree_id' => $treeId,
            'user_id' => $request->user()->id,
            'action_type' => 'create',
            'entity_type' => 'person',
            'entity_id' => $person->id,
            'new_data' => $person->toArray(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $person,
            'message' => 'Person created successfully',
        ], 201);
    }
}
```

### 3. Request Validation with Tree Access
```php
// app/Http/Requests/StorePersonRequest.php
class StorePersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $treeId = $this->route('tree');
        return $this->user()->canAccessTree($treeId) &&
               in_array($this->user()->getTreePermission($treeId), ['admin', 'edit']);
    }

    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'maiden_name' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'gender' => 'nullable|in:M,F,O',
            'birth_date' => 'nullable|date|before:today',
            'death_date' => 'nullable|date|after:birth_date',
            'birth_place' => 'nullable|string|max:500',
            'death_place' => 'nullable|string|max:500',
            'father_id' => ['nullable', 'string', new PersonBelongsToTree($this->route('tree'))],
            'mother_id' => ['nullable', 'string', new PersonBelongsToTree($this->route('tree'))],
            'notes' => 'nullable|string|max:2000',
            'photo' => 'nullable|image|max:2048', // 2MB max
        ];
    }
}

// app/Rules/PersonBelongsToTree.php
class PersonBelongsToTree implements Rule
{
    private string $treeId;

    public function __construct(string $treeId)
    {
        $this->treeId = $treeId;
    }

    public function passes($attribute, $value): bool
    {
        if (!$value) {
            return true; // Nullable field
        }

        return Person::where('id', $value)
            ->where('family_tree_id', $this->treeId)
            ->exists();
    }

    public function message(): string
    {
        return 'The selected person does not belong to this family tree.';
    }
}
```

## Permission System

### Permission Levels
1. **Admin**: Full access (owner + shared admin users)
   - Create, read, update, delete people and relationships
   - Modify tree settings
   - Share tree with others
   - Delete entire tree

2. **Edit**: Read and write access
   - Create, read, update, delete people and relationships
   - Cannot modify tree settings or sharing

3. **View**: Read-only access
   - View tree and all people
   - Cannot make any modifications

### Middleware for Permission Checking
```php
// app/Http/Middleware/CheckTreePermission.php
class CheckTreePermission
{
    public function handle(Request $request, Closure $next, string $requiredPermission = 'view')
    {
        $user = $request->user();
        $treeId = $request->route('tree') ?? $request->route('treeId');

        if (!$treeId || !$user->canAccessTree($treeId)) {
            return response()->json([
                'success' => false,
                'message' => 'Tree not found or access denied',
            ], 404);
        }

        $userPermission = $user->getTreePermission($treeId);
        
        if (!$this->hasRequiredPermission($userPermission, $requiredPermission)) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient permissions',
            ], 403);
        }

        // Add tree info to request for later use
        $request->merge([
            'user_tree_permission' => $userPermission,
            'tree_id' => $treeId,
        ]);

        return $next($request);
    }

    private function hasRequiredPermission(?string $userPermission, string $requiredPermission): bool
    {
        if (!$userPermission) {
            return false;
        }

        $permissionLevels = [
            'view' => 1,
            'edit' => 2,
            'admin' => 3,
        ];

        return $permissionLevels[$userPermission] >= $permissionLevels[$requiredPermission];
    }
}

// Usage in routes
Route::middleware(['auth:sanctum', 'tree-permission:view'])->group(function () {
    Route::get('/trees/{tree}', [FamilyTreeController::class, 'show']);
    Route::get('/trees/{tree}/people', [PersonController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'tree-permission:edit'])->group(function () {
    Route::post('/trees/{tree}/people', [PersonController::class, 'store']);
    Route::put('/people/{person}', [PersonController::class, 'update']);
    Route::delete('/people/{person}', [PersonController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tree-permission:admin'])->group(function () {
    Route::put('/trees/{tree}', [FamilyTreeController::class, 'update']);
    Route::delete('/trees/{tree}', [FamilyTreeController::class, 'destroy']);
    Route::post('/trees/{tree}/share', [TreeSharingController::class, 'share']);
});
```

## Tree Sharing System

### Sharing Models
```php
// app/Models/SharedTree.php
class SharedTree extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'family_tree_id',
        'shared_by_user_id',
        'shared_with_email',
        'shared_with_user_id',
        'permission_level',
        'share_token',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function ($share) {
            if (!$share->id) {
                $share->id = (string) Str::uuid();
            }
            if (!$share->share_token) {
                $share->share_token = Str::random(32);
            }
        });
    }

    // Relationships
    public function familyTree(): BelongsTo
    {
        return $this->belongsTo(FamilyTree::class);
    }

    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by_user_id');
    }

    public function sharedWith(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_with_user_id');
    }

    // Helper methods
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isActive(): bool
    {
        return $this->is_active && !$this->isExpired();
    }
}
```

### Sharing Controller
```php
// app/Http/Controllers/TreeSharingController.php
class TreeSharingController extends Controller
{
    public function share(ShareTreeRequest $request, string $treeId)
    {
        $user = $request->user();
        $tree = FamilyTree::findOrFail($treeId);

        // Check if user is owner or admin
        if ($tree->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only tree owner can share trees',
            ], 403);
        }

        $sharedTree = SharedTree::create([
            'family_tree_id' => $treeId,
            'shared_by_user_id' => $user->id,
            'shared_with_email' => $request->email,
            'shared_with_user_id' => User::where('email', $request->email)->first()?->id,
            'permission_level' => $request->permission_level,
            'expires_at' => $request->expires_at,
        ]);

        // Send email notification
        Mail::to($request->email)->send(new TreeSharedMail($sharedTree));

        return response()->json([
            'success' => true,
            'data' => $sharedTree,
            'message' => 'Tree shared successfully',
        ]);
    }

    public function acceptShare(string $token)
    {
        $share = SharedTree::where('share_token', $token)
            ->where('is_active', true)
            ->first();

        if (!$share || $share->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired share link',
            ], 404);
        }

        $user = auth()->user();
        
        // Update share with user ID if they match email
        if ($user && $user->email === $share->shared_with_email) {
            $share->update(['shared_with_user_id' => $user->id]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tree' => $share->familyTree,
                'permission' => $share->permission_level,
                'shared_by' => $share->sharedBy->name,
            ],
        ]);
    }
}
```

## Frontend Integration

### Authentication Context
```typescript
// contexts/AuthContext.tsx
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and validate
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          apiService.setToken(token);
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: async (credentials) => {
      const { user: userData, token } = await authService.login(credentials);
      localStorage.setItem('auth_token', token);
      apiService.setToken(token);
      setUser(userData);
    },
    logout: async () => {
      await authService.logout();
      localStorage.removeItem('auth_token');
      apiService.setToken(null);
      setUser(null);
    },
    // ... other methods
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### Protected Routes
```typescript
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: 'view' | 'edit' | 'admin';
  treeId?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission = 'view',
  treeId,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: treeAccess, isLoading: checkingAccess } = useTreeAccess(treeId);

  if (isLoading || (treeId && checkingAccess)) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (treeId && (!treeAccess || !hasPermission(treeAccess.permission, requiredPermission))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Usage in routing
const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      <Route path="/trees/:treeId" element={
        <ProtectedRoute treeId=":treeId" requiredPermission="view">
          <TreeViewPage />
        </ProtectedRoute>
      } />
      
      <Route path="/trees/:treeId/edit" element={
        <ProtectedRoute treeId=":treeId" requiredPermission="edit">
          <TreeEditPage />
        </ProtectedRoute>
      } />
    </Routes>
  );
};
```

This user system integration provides secure, scalable user management with proper data isolation and flexible permission controls for the family tree application.