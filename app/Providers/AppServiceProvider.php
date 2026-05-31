<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use PhpOffice\PhpSpreadsheet\Settings;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    config(['excel.temporary_files.local_path' => storage_path('app/temp')]);
    }
}
