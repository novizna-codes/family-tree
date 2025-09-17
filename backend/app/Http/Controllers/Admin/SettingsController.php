<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = SystemSetting::all()->keyBy('key');
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
            'settings.*.type' => 'required|in:string,boolean,integer,float,json',
        ]);

        foreach ($request->settings as $setting) {
            SystemSetting::set(
                $setting['key'],
                $setting['value'],
                $setting['type']
            );
        }

        return response()->json(['message' => 'Settings updated successfully.']);
    }

    public function show(string $key)
    {
        $value = SystemSetting::get($key);
        
        if ($value === null) {
            return response()->json(['message' => 'Setting not found.'], 404);
        }

        return response()->json(['value' => $value]);
    }
}
