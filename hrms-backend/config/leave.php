<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Leave Entitlements
    |--------------------------------------------------------------------------
    |
    | This file contains the default leave entitlements for different leave types.
    | These values represent the number of days an employee is entitled to per year.
    |
    */
    
    'entitlements' => [
        'Vacation Leave' => 5,
        'Sick Leave' => 4,
        'Emergency Leave' => 5,
        'Personal Leave' => 5,
        'Bereavement Leave' => 5,
        'Maternity Leave' => 105,
        'Paternity Leave' => 7,
        'Leave for Victims of Violence Against Women and Their Children (VAWC)' => 10,
        'Women\'s Special Leave' => 60,
        'Parental Leave' => 7,
    ],

    /*
    |--------------------------------------------------------------------------
    | With Pay Days Configuration
    |--------------------------------------------------------------------------
    |
    | Defines the maximum number of "With Pay" days for each leave type.
    | When an employee requests more days than the with_pay limit,
    | the excess days are automatically marked as "Without Pay".
    |
    */
    
    'with_pay_days' => [
        'Sick Leave' => 1,
        'Emergency Leave' => 4,
        'Vacation Leave' => 5,
        'Maternity Leave' => 105,
        'Paternity Leave' => 7,
        'Leave for Victims of Violence Against Women and Their Children (VAWC)' => 10,
        'Women\'s Special Leave' => 60,
        'Parental Leave' => 7,
        'Personal Leave' => 5,
        'Bereavement Leave' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Leave Categories
    |--------------------------------------------------------------------------
    |
    | Define how leave types are categorized for reporting and balance tracking.
    |
    */
    
    'categories' => [
        'annual' => ['Vacation Leave', 'Personal Leave'],
        'medical' => ['Sick Leave'],
        'emergency' => ['Emergency Leave'],
        'family' => ['Bereavement Leave', 'Maternity Leave', 'Paternity Leave'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Leave Type Settings
    |--------------------------------------------------------------------------
    |
    | Additional settings for specific leave types
    |
    */
    
    'settings' => [
        'Maternity Leave' => [
            'requires_medical_certificate' => true,
            'advance_notice_days' => 30,
            'paid' => true,
        ],
        'Paternity Leave' => [
            'requires_medical_certificate' => false,
            'advance_notice_days' => 7,
            'paid' => true,
        ],
        'Sick Leave' => [
            'requires_medical_certificate' => true,
            'advance_notice_days' => 0,
            'paid' => true,
        ],
        'Emergency Leave' => [
            'requires_documentation' => true,
            'advance_notice_days' => 0,
            'paid' => false,
        ],
    ],
];
