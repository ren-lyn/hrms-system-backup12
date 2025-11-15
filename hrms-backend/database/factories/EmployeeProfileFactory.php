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
        return [
            'user_id' => \App\Models\User::factory(),
            'first_name' => $this->faker->firstName,
            'last_name' => $this->faker->lastName,
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
