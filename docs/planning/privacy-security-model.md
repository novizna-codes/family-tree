# Privacy and Security Model

## Overview
The Family Tree Application implements a comprehensive security model that prioritizes user privacy, data protection, and secure access control. This document outlines all security measures, privacy controls, and compliance considerations.

## Security Architecture

### 1. Authentication & Authorization

#### Multi-Layer Authentication
```php
// Authentication flow with multiple validation layers
class AuthenticationService
{
    public function authenticate(LoginRequest $request): AuthResult
    {
        // 1. Input validation and sanitization
        $credentials = $this->validateAndSanitize($request);
        
        // 2. Rate limiting check
        if ($this->isRateLimited($request->ip())) {
            throw new TooManyAttemptsException();
        }
        
        // 3. User existence and password verification
        $user = $this->verifyCredentials($credentials);
        
        // 4. Account status validation
        $this->validateAccountStatus($user);
        
        // 5. Generate secure token
        $token = $this->generateSecureToken($user);
        
        // 6. Log authentication event
        $this->logAuthenticationEvent($user, $request);
        
        return new AuthResult($user, $token);
    }
    
    private function generateSecureToken(User $user): string
    {
        return $user->createToken(
            name: 'family-tree-app',
            abilities: ['*'],
            expiresAt: now()->addDays(30)
        )->plainTextToken;
    }
}
```

#### Role-Based Access Control (RBAC)
```php
// Permission system for family trees
enum TreePermission: string
{
    case VIEW = 'view';
    case EDIT = 'edit';
    case ADMIN = 'admin';
    case OWNER = 'owner';
}

class TreeAccessControl
{
    public function hasPermission(User $user, FamilyTree $tree, TreePermission $permission): bool
    {
        // Owner has all permissions
        if ($tree->user_id === $user->id) {
            return true;
        }
        
        // Check shared permissions
        $sharedTree = SharedTree::where('family_tree_id', $tree->id)
            ->where('shared_with_user_id', $user->id)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->first();
        
        if (!$sharedTree) {
            return false;
        }
        
        return $this->permissionIncludes($sharedTree->permission_level, $permission);
    }
    
    private function permissionIncludes(string $userPermission, TreePermission $requiredPermission): bool
    {
        $hierarchy = [
            TreePermission::VIEW->value => 1,
            TreePermission::EDIT->value => 2,
            TreePermission::ADMIN->value => 3,
            TreePermission::OWNER->value => 4,
        ];
        
        return $hierarchy[$userPermission] >= $hierarchy[$requiredPermission->value];
    }
}
```

### 2. Data Encryption & Protection

#### Database Encryption
```php
// Sensitive data encryption at rest
class EncryptedPersonModel extends Model
{
    protected $casts = [
        'notes' => 'encrypted',           // Personal notes
        'birth_place' => 'encrypted',     // Sensitive location data
        'death_place' => 'encrypted',     // Sensitive location data
        'maiden_name' => 'encrypted',     // Sensitive personal data
    ];
    
    // Custom accessor for search while maintaining encryption
    public function getSearchableNotesAttribute(): string
    {
        // One-way hash for search indexing
        return hash('sha256', $this->notes ?? '');
    }
}

// File encryption for photos
class PhotoService
{
    public function storePhoto(UploadedFile $file, Person $person): string
    {
        $encryptedContent = encrypt($file->getContent());
        $filename = $this->generateSecureFilename($person);
        
        Storage::disk('private')->put($filename, $encryptedContent);
        
        return $filename;
    }
    
    public function getPhoto(string $filename): ?string
    {
        $encryptedContent = Storage::disk('private')->get($filename);
        return $encryptedContent ? decrypt($encryptedContent) : null;
    }
    
    private function generateSecureFilename(Person $person): string
    {
        return 'photos/' . hash('sha256', $person->id . config('app.key')) . '.enc';
    }
}
```

#### Data Transmission Security
```php
// API security middleware
class SecureApiMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Force HTTPS in production
        if (!$request->secure() && app()->environment('production')) {
            return redirect()->secure($request->getRequestUri());
        }
        
        // 2. Validate Content-Type for POST/PUT requests
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            if (!$request->isJson() && !$request->hasFile('photo')) {
                return response()->json(['error' => 'Invalid content type'], 400);
            }
        }
        
        // 3. Add security headers
        $response = $next($request);
        
        return $response->withHeaders([
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'X-XSS-Protection' => '1; mode=block',
            'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy' => $this->getCSPHeader(),
        ]);
    }
    
    private function getCSPHeader(): string
    {
        return "default-src 'self'; " .
               "script-src 'self' 'unsafe-inline'; " .
               "style-src 'self' 'unsafe-inline'; " .
               "img-src 'self' data: blob:; " .
               "font-src 'self'; " .
               "connect-src 'self'; " .
               "frame-ancestors 'none'";
    }
}
```

### 3. Input Validation & Sanitization

#### Comprehensive Validation
```php
// Request validation with security considerations
class StorePersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $treeId = $this->route('tree');
        return $this->user()->canAccessTree($treeId) &&
               $this->user()->hasTreePermission($treeId, TreePermission::EDIT);
    }
    
    public function rules(): array
    {
        return [
            'first_name' => [
                'required',
                'string',
                'max:255',
                'regex:/^[\p{L}\p{M}\p{Zs}\.\-\']+$/u', // Unicode letters, marks, spaces, dots, hyphens, apostrophes
            ],
            'last_name' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[\p{L}\p{M}\p{Zs}\.\-\']+$/u',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:2000',
                new NoMaliciousContent(), // Custom rule to prevent XSS
            ],
            'birth_date' => [
                'nullable',
                'date',
                'before:today',
                'after:1800-01-01', // Reasonable date range
            ],
            'photo' => [
                'nullable',
                'image',
                'max:2048', // 2MB limit
                'mimes:jpeg,png,jpg,gif',
                new SafeImageContent(), // Custom rule to validate image content
            ],
        ];
    }
    
    protected function prepareForValidation(): void
    {
        // Sanitize input data
        $this->merge([
            'first_name' => $this->sanitizeTextInput($this->first_name),
            'last_name' => $this->sanitizeTextInput($this->last_name),
            'notes' => $this->sanitizeTextInput($this->notes),
        ]);
    }
    
    private function sanitizeTextInput(?string $input): ?string
    {
        if (!$input) return null;
        
        // Remove potential XSS vectors while preserving international characters
        $clean = strip_tags($input);
        $clean = html_entity_decode($clean, ENT_QUOTES, 'UTF-8');
        $clean = trim($clean);
        
        return $clean ?: null;
    }
}

// Custom validation rules for security
class NoMaliciousContent implements Rule
{
    public function passes($attribute, $value): bool
    {
        if (!$value) return true;
        
        $maliciousPatterns = [
            '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi',
            '/javascript:/i',
            '/on\w+\s*=/i',
            '/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi',
            '/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi',
        ];
        
        foreach ($maliciousPatterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return false;
            }
        }
        
        return true;
    }
    
    public function message(): string
    {
        return 'The :attribute contains potentially harmful content.';
    }
}
```

## Privacy Controls

### 1. Data Minimization

#### Personal Data Collection Policy
```php
// Minimal data collection with explicit consent
class PersonalDataPolicy
{
    public static function getRequiredFields(): array
    {
        return ['first_name']; // Only essential data is required
    }
    
    public static function getOptionalFields(): array
    {
        return [
            'last_name',
            'maiden_name',
            'nickname',
            'gender',
            'birth_date',
            'death_date',
            'birth_place',
            'death_place',
            'notes',
            'photo',
        ];
    }
    
    public static function getSensitiveFields(): array
    {
        return [
            'birth_place',
            'death_place',
            'notes',
            'photo',
        ];
    }
}

// Data retention policy
class DataRetentionService
{
    public function enforceRetentionPolicy(): void
    {
        // Remove soft-deleted trees after 90 days
        FamilyTree::onlyTrashed()
            ->where('deleted_at', '<', now()->subDays(90))
            ->forceDelete();
        
        // Remove inactive user accounts after 2 years
        User::where('last_login_at', '<', now()->subYears(2))
            ->whereDoesntHave('familyTrees')
            ->delete();
        
        // Clean up expired sharing tokens
        SharedTree::where('expires_at', '<', now())
            ->delete();
    }
}
```

### 2. User Privacy Controls

#### Privacy Settings Management
```php
// User privacy preferences
class PrivacySettings extends Model
{
    protected $fillable = [
        'user_id',
        'data_processing_consent',
        'marketing_consent',
        'analytics_consent',
        'sharing_default_permission',
        'public_profile_enabled',
        'search_indexing_enabled',
    ];
    
    protected $casts = [
        'data_processing_consent' => 'boolean',
        'marketing_consent' => 'boolean',
        'analytics_consent' => 'boolean',
        'public_profile_enabled' => 'boolean',
        'search_indexing_enabled' => 'boolean',
    ];
}

// Privacy-aware search
class PrivacyAwareSearchService
{
    public function searchPeople(string $query, User $user): Collection
    {
        return Person::accessibleByUser($user)
            ->whereHas('familyTree.user.privacySettings', function ($privacyQuery) {
                $privacyQuery->where('search_indexing_enabled', true);
            })
            ->where(function ($nameQuery) use ($query) {
                $nameQuery->where('first_name', 'like', "%{$query}%")
                         ->orWhere('last_name', 'like', "%{$query}%");
            })
            ->get();
    }
}
```

### 3. Data Export & Portability

#### GDPR-Compliant Data Export
```php
// Complete user data export
class UserDataExportService
{
    public function exportUserData(User $user): array
    {
        return [
            'user_info' => $this->exportUserInfo($user),
            'family_trees' => $this->exportFamilyTrees($user),
            'people' => $this->exportPeople($user),
            'relationships' => $this->exportRelationships($user),
            'shared_trees' => $this->exportSharedTrees($user),
            'activity_logs' => $this->exportActivityLogs($user),
            'export_metadata' => [
                'exported_at' => now()->toISOString(),
                'format_version' => '1.0',
                'data_controller' => config('app.name'),
            ],
        ];
    }
    
    private function exportUserInfo(User $user): array
    {
        return $user->only([
            'name',
            'email',
            'preferred_language',
            'timezone',
            'created_at',
            'updated_at',
        ]);
    }
    
    private function exportFamilyTrees(User $user): array
    {
        return $user->familyTrees()->get()->map(function ($tree) {
            return $tree->only([
                'id',
                'name',
                'description',
                'created_at',
                'updated_at',
            ]);
        })->toArray();
    }
    
    // Include photos as base64 for complete export
    private function exportPeople(User $user): array
    {
        return $user->familyTrees()
            ->with('people')
            ->get()
            ->pluck('people')
            ->flatten()
            ->map(function ($person) {
                $data = $person->toArray();
                
                // Include photo data if exists
                if ($person->photo_path) {
                    try {
                        $photoData = app(PhotoService::class)->getPhoto($person->photo_path);
                        $data['photo_data'] = base64_encode($photoData);
                    } catch (Exception $e) {
                        $data['photo_data'] = null;
                    }
                }
                
                return $data;
            })
            ->toArray();
    }
}
```

## Security Monitoring & Logging

### 1. Comprehensive Audit Logging

#### Security Event Logging
```php
// Security audit logging
class SecurityAuditLogger
{
    public function logAuthenticationAttempt(string $email, string $ip, bool $successful): void
    {
        SecurityLog::create([
            'event_type' => 'authentication_attempt',
            'user_email' => $email,
            'ip_address' => $ip,
            'successful' => $successful,
            'user_agent' => request()->userAgent(),
            'occurred_at' => now(),
        ]);
    }
    
    public function logDataAccess(User $user, string $resource, array $metadata = []): void
    {
        SecurityLog::create([
            'event_type' => 'data_access',
            'user_id' => $user->id,
            'resource' => $resource,
            'ip_address' => request()->ip(),
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }
    
    public function logSuspiciousActivity(string $activityType, array $details): void
    {
        SecurityLog::create([
            'event_type' => 'suspicious_activity',
            'activity_type' => $activityType,
            'ip_address' => request()->ip(),
            'metadata' => $details,
            'occurred_at' => now(),
        ]);
        
        // Trigger security alert if needed
        if ($this->isHighRiskActivity($activityType)) {
            $this->triggerSecurityAlert($activityType, $details);
        }
    }
}

// Automated threat detection
class ThreatDetectionService
{
    public function detectAnomalousActivity(User $user): array
    {
        $threats = [];
        
        // Detect unusual login patterns
        $recentLogins = SecurityLog::where('user_id', $user->id)
            ->where('event_type', 'authentication_attempt')
            ->where('successful', true)
            ->where('occurred_at', '>', now()->subDays(7))
            ->get();
        
        $uniqueIPs = $recentLogins->pluck('ip_address')->unique();
        if ($uniqueIPs->count() > 5) {
            $threats[] = [
                'type' => 'multiple_ip_logins',
                'severity' => 'medium',
                'details' => "User logged in from {$uniqueIPs->count()} different IPs in the last 7 days",
            ];
        }
        
        // Detect rapid data creation
        $recentCreations = ActivityLog::where('user_id', $user->id)
            ->where('action_type', 'create')
            ->where('created_at', '>', now()->subHour())
            ->count();
        
        if ($recentCreations > 50) {
            $threats[] = [
                'type' => 'rapid_data_creation',
                'severity' => 'high',
                'details' => "User created {$recentCreations} records in the last hour",
            ];
        }
        
        return $threats;
    }
}
```

### 2. Rate Limiting & DDoS Protection

#### Advanced Rate Limiting
```php
// Multi-layer rate limiting
class AdvancedRateLimiter
{
    public function checkLimits(Request $request): void
    {
        $ip = $request->ip();
        $user = $request->user();
        
        // Global IP-based rate limiting
        $this->checkIPRateLimit($ip);
        
        // User-based rate limiting (if authenticated)
        if ($user) {
            $this->checkUserRateLimit($user);
        }
        
        // Endpoint-specific rate limiting
        $this->checkEndpointRateLimit($request);
    }
    
    private function checkIPRateLimit(string $ip): void
    {
        $key = "rate_limit:ip:{$ip}";
        $attempts = Cache::get($key, 0);
        
        if ($attempts > 100) { // 100 requests per minute per IP
            throw new TooManyRequestsHttpException(60, 'Too many requests from this IP');
        }
        
        Cache::put($key, $attempts + 1, 60);
    }
    
    private function checkUserRateLimit(User $user): void
    {
        $key = "rate_limit:user:{$user->id}";
        $attempts = Cache::get($key, 0);
        
        if ($attempts > 500) { // 500 requests per minute per user
            throw new TooManyRequestsHttpException(60, 'Too many requests');
        }
        
        Cache::put($key, $attempts + 1, 60);
    }
}
```

## Incident Response Plan

### 1. Security Incident Classification

#### Incident Severity Levels
```php
enum SecurityIncidentSeverity: string
{
    case LOW = 'low';           // Suspicious activity, failed login attempts
    case MEDIUM = 'medium';     // Unauthorized access attempts, data validation failures
    case HIGH = 'high';         // Data breach, successful unauthorized access
    case CRITICAL = 'critical'; // System compromise, mass data exposure
}

class SecurityIncidentResponse
{
    public function handleIncident(
        SecurityIncidentSeverity $severity,
        string $type,
        array $details
    ): void {
        // 1. Log the incident
        $this->logIncident($severity, $type, $details);
        
        // 2. Immediate response based on severity
        match ($severity) {
            SecurityIncidentSeverity::LOW => $this->handleLowSeverity($details),
            SecurityIncidentSeverity::MEDIUM => $this->handleMediumSeverity($details),
            SecurityIncidentSeverity::HIGH => $this->handleHighSeverity($details),
            SecurityIncidentSeverity::CRITICAL => $this->handleCriticalSeverity($details),
        };
        
        // 3. Notify appropriate stakeholders
        $this->notifyStakeholders($severity, $type, $details);
    }
    
    private function handleCriticalSeverity(array $details): void
    {
        // Immediate containment
        $this->enableMaintenanceMode();
        $this->invalidateAllSessions();
        $this->blockSuspiciousIPs($details);
        
        // Emergency notification
        $this->sendEmergencyAlert($details);
    }
}
```

### 2. Data Breach Response

#### Breach Notification Procedures
```php
class DataBreachResponse
{
    public function handleDataBreach(array $affectedData, string $cause): void
    {
        // 1. Immediate containment
        $this->containBreach($cause);
        
        // 2. Assess impact
        $impact = $this->assessBreachImpact($affectedData);
        
        // 3. User notification (GDPR compliance)
        if ($this->requiresUserNotification($impact)) {
            $this->notifyAffectedUsers($affectedData);
        }
        
        // 4. Regulatory notification (within 72 hours)
        if ($impact['severity'] >= 3) {
            $this->notifyDataProtectionAuthority($impact);
        }
        
        // 5. Documentation and remediation
        $this->documentBreach($affectedData, $cause, $impact);
        $this->implementRemediation($cause);
    }
    
    private function notifyAffectedUsers(array $affectedData): void
    {
        $affectedUserIds = collect($affectedData)->pluck('user_id')->unique();
        
        User::whereIn('id', $affectedUserIds)->each(function ($user) {
            Mail::to($user)->send(new DataBreachNotificationMail([
                'incident_reference' => $this->generateIncidentReference(),
                'occurred_at' => now(),
                'data_types_affected' => $this->getAffectedDataTypes($user),
                'remediation_steps' => $this->getRemediationSteps(),
            ]));
        });
    }
}
```

## Compliance & Standards

### 1. GDPR Compliance

#### Data Subject Rights Implementation
```php
class GDPRComplianceService
{
    // Right to Access (Article 15)
    public function handleAccessRequest(User $user): array
    {
        return app(UserDataExportService::class)->exportUserData($user);
    }
    
    // Right to Rectification (Article 16)
    public function handleRectificationRequest(User $user, array $corrections): void
    {
        foreach ($corrections as $field => $value) {
            if ($this->isRectifiableField($field)) {
                $user->update([$field => $value]);
            }
        }
        
        $this->logGDPRAction($user, 'rectification', $corrections);
    }
    
    // Right to Erasure (Article 17)
    public function handleErasureRequest(User $user): void
    {
        // 1. Check for legitimate interests or legal obligations
        if ($this->hasLegitimateInterestToRetain($user)) {
            throw new GDPRException('Cannot erase data due to legitimate interests');
        }
        
        // 2. Anonymize or delete personal data
        $this->anonymizeUserData($user);
        
        // 3. Notify data processors
        $this->notifyDataProcessors($user->id, 'erasure');
        
        $this->logGDPRAction($user, 'erasure');
    }
    
    // Right to Data Portability (Article 20)
    public function handlePortabilityRequest(User $user): string
    {
        $data = $this->handleAccessRequest($user);
        
        // Convert to machine-readable format
        return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
    private function anonymizeUserData(User $user): void
    {
        // Replace personal identifiers with anonymous values
        $user->update([
            'name' => 'Anonymous User ' . $user->id,
            'email' => 'deleted.' . $user->id . '@example.com',
        ]);
        
        // Anonymize family tree data
        $user->familyTrees()->each(function ($tree) {
            $tree->people()->update([
                'first_name' => 'Anonymous',
                'last_name' => null,
                'maiden_name' => null,
                'notes' => null,
                'photo_path' => null,
            ]);
        });
    }
}
```

### 2. Security Standards Compliance

#### ISO 27001 Controls Implementation
```php
class ISO27001Controls
{
    // A.9.1.2 Access to networks and network services
    public function implementNetworkAccessControl(): void
    {
        // VPN requirement for admin access
        // IP whitelisting for sensitive operations
        // Network segmentation for data storage
    }
    
    // A.10.1.1 Policy on the use of cryptographic controls
    public function implementCryptographicControls(): void
    {
        // AES-256 encryption for data at rest
        // TLS 1.3 for data in transit
        // Key rotation every 90 days
    }
    
    // A.12.6.1 Management of technical vulnerabilities
    public function implementVulnerabilityManagement(): void
    {
        // Automated security scanning
        // Regular penetration testing
        // Vulnerability assessment reports
    }
}
```

This comprehensive security model ensures the family tree application meets high standards for privacy protection, data security, and regulatory compliance while maintaining usability for end users.
