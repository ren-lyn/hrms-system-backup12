<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EmployeeProfile>
 */
class EmployeeProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = $this->faker->firstName;
        $lastName = $this->faker->lastName;
        $email = $this->faker->unique()->safeEmail;
        
        // Get Employee role ID
        $employeeRole = \App\Models\Role::where('name', 'Employee')->first();
        $roleId = $employeeRole ? $employeeRole->id : \App\Models\Role::inRandomOrder()->first()?->id;
        
        return [
            'user_id' => \App\Models\User::factory()->create([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'role_id' => $roleId,
            ])->id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'position' => $this->faker->jobTitle,
            'department' => $this->faker->word,
            'salary' => $this->faker->numberBetween(20000, 50000),
            'contact_number' => $this->faker->phoneNumber,
            'address' => $this->faker->address,
            'sss' => $this->faker->numerify('##-#######-#'),
            'philhealth' => 'PH-' . $this->faker->numerify('#########'),
            'pagibig' => 'PG-' . $this->faker->numerify('#########'),
            'tin_no' => $this->faker->numerify('###-###-###-###'),
        ];
    }
}
