<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TreeExportArtifact extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tree_id',
        'user_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size_bytes',
        'checksum_sha256',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function familyTree()
    {
        return $this->belongsTo(FamilyTree::class, 'tree_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
