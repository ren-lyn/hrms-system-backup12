<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Holiday;
use Carbon\Carbon;

class Holiday2025To2050Seeder extends Seeder
{
    /**
     * Calculate Easter Sunday date for a given year using the Computus algorithm
     */
    private function calculateEaster($year)
    {
        $a = $year % 19;
        $b = intval($year / 100);
        $c = $year % 100;
        $d = intval($b / 4);
        $e = $b % 4;
        $f = intval(($b + 8) / 25);
        $g = intval(($b - $f + 1) / 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intval($c / 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intval(($a + 11 * $h + 22 * $l) / 451);
        $month = intval(($h + $l - 7 * $m + 114) / 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;
        
        return Carbon::create($year, $month, $day);
    }

    /**
     * Get the last Monday of August for a given year
     */
    private function getLastMondayOfAugust($year)
    {
        $lastDay = Carbon::create($year, 8, 31);
        $dayOfWeek = $lastDay->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.
        
        // If the last day is already Monday, return it
        if ($dayOfWeek == 1) {
            return $lastDay;
        }
        
        // Otherwise, go back to the previous Monday
        $daysBack = ($dayOfWeek == 0) ? 6 : ($dayOfWeek - 1);
        return $lastDay->subDays($daysBack);
    }

    /**
     * Get Chinese New Year date for a given year
     */
    private function getChineseNewYear($year)
    {
        // Chinese New Year dates (approximate, based on lunar calendar)
        $cnyDates = [
            2025 => '2025-01-29',
            2026 => '2026-02-17',
            2027 => '2027-02-06',
            2028 => '2028-01-26',
            2029 => '2029-02-13',
            2030 => '2030-02-03',
            2031 => '2031-01-23',
            2032 => '2032-02-11',
            2033 => '2033-01-31',
            2034 => '2034-02-19',
            2035 => '2035-02-08',
            2036 => '2036-01-28',
            2037 => '2037-02-15',
            2038 => '2038-02-04',
            2039 => '2039-01-24',
            2040 => '2040-02-12',
            2041 => '2041-02-01',
            2042 => '2042-01-22',
            2043 => '2043-02-10',
            2044 => '2044-01-30',
            2045 => '2045-02-17',
            2046 => '2046-02-06',
            2047 => '2047-01-26',
            2048 => '2048-02-14',
            2049 => '2049-02-02',
            2050 => '2050-01-23',
        ];
        
        return isset($cnyDates[$year]) ? $cnyDates[$year] : null;
    }

    /**
     * Get approximate Eid al-Fitr date (subject to moon sighting)
     * Note: These dates are approximate and may vary by 1-2 days based on actual moon sighting
     */
    private function getEidAlFitr($year)
    {
        // Approximate dates based on Islamic calendar (may vary by 1-2 days)
        // The Islamic calendar moves backwards about 11 days per year
        $eidFitrDates = [
            2025 => '2025-03-31',
            2026 => '2026-03-20',
            2027 => '2027-03-10',
            2028 => '2028-02-27',
            2029 => '2029-02-15',
            2030 => '2030-02-05',
            2031 => '2031-01-25',
            2032 => '2032-01-14',
            2033 => '2033-01-03',
            2034 => '2033-12-23',
            2035 => '2034-12-12',
            2036 => '2035-12-01',
            2037 => '2036-11-20',
            2038 => '2037-11-10',
            2039 => '2038-10-30',
            2040 => '2039-10-19',
            2041 => '2040-10-07',
            2042 => '2041-09-26',
            2043 => '2042-09-16',
            2044 => '2043-09-05',
            2045 => '2044-08-24',
            2046 => '2045-08-14',
            2047 => '2046-08-03',
            2048 => '2047-07-23',
            2049 => '2048-07-12',
            2050 => '2049-07-02',
        ];
        
        return isset($eidFitrDates[$year]) ? $eidFitrDates[$year] : null;
    }

    /**
     * Get approximate Eid al-Adha date (subject to moon sighting)
     * Note: These dates are approximate and may vary by 1-2 days based on actual moon sighting
     */
    private function getEidAlAdha($year)
    {
        // Approximate dates based on Islamic calendar (may vary by 1-2 days)
        // Eid al-Adha is approximately 70 days after Eid al-Fitr
        $eidAdhaDates = [
            2025 => '2025-06-06',
            2026 => '2026-05-27',
            2027 => '2027-05-16',
            2028 => '2028-05-05',
            2029 => '2029-04-24',
            2030 => '2030-04-13',
            2031 => '2031-04-02',
            2032 => '2032-03-22',
            2033 => '2033-03-11',
            2034 => '2034-02-28',
            2035 => '2035-02-17',
            2036 => '2036-02-06',
            2037 => '2037-01-26',
            2038 => '2038-01-14',
            2039 => '2039-01-04',
            2040 => '2039-12-24',
            2041 => '2040-12-12',
            2042 => '2041-12-01',
            2043 => '2042-11-20',
            2044 => '2043-11-10',
            2045 => '2044-10-30',
            2046 => '2045-10-18',
            2047 => '2046-10-07',
            2048 => '2047-09-26',
            2049 => '2048-09-16',
            2050 => '2049-09-04',
        ];
        
        return isset($eidAdhaDates[$year]) ? $eidAdhaDates[$year] : null;
    }

    public function run(): void
    {
        $holidays = [];

        // Generate holidays for years 2025 to 2050
        for ($year = 2025; $year <= 2050; $year++) {
            // Fixed Regular Holidays
            $holidays[] = ['name' => "New Year's Day", 'date' => "{$year}-01-01", 'type' => 'Regular'];
            $holidays[] = ['name' => 'Araw ng Kagitingan (Day of Valor)', 'date' => "{$year}-04-09", 'type' => 'Regular'];
            $holidays[] = ['name' => 'Labor Day', 'date' => "{$year}-05-01", 'type' => 'Regular'];
            $holidays[] = ['name' => 'Independence Day', 'date' => "{$year}-06-12", 'type' => 'Regular'];
            $holidays[] = ['name' => 'Bonifacio Day', 'date' => "{$year}-11-30", 'type' => 'Regular'];
            $holidays[] = ['name' => 'Christmas Day', 'date' => "{$year}-12-25", 'type' => 'Regular'];
            $holidays[] = ['name' => 'Rizal Day', 'date' => "{$year}-12-30", 'type' => 'Regular'];

            // Fixed Special (Non-Working) Days
            $holidays[] = ['name' => 'EDSA People Power Revolution Anniversary', 'date' => "{$year}-02-25", 'type' => 'Special'];
            $holidays[] = ['name' => "Ninoy Aquino Day", 'date' => "{$year}-08-21", 'type' => 'Special'];
            $holidays[] = ['name' => "All Saints' Day", 'date' => "{$year}-11-01", 'type' => 'Special'];
            $holidays[] = ['name' => "All Souls' Day", 'date' => "{$year}-11-02", 'type' => 'Special'];
            $holidays[] = ['name' => 'Feast of the Immaculate Conception of the Blessed Virgin Mary', 'date' => "{$year}-12-08", 'type' => 'Special'];
            $holidays[] = ['name' => 'Christmas Eve', 'date' => "{$year}-12-24", 'type' => 'Special'];
            $holidays[] = ['name' => "New Year's Eve", 'date' => "{$year}-12-31", 'type' => 'Special'];

            // National Heroes' Day (Last Monday of August)
            $nationalHeroesDay = $this->getLastMondayOfAugust($year);
            $holidays[] = ['name' => "National Heroes' Day", 'date' => $nationalHeroesDay->format('Y-m-d'), 'type' => 'Regular'];

            // Chinese New Year
            $cnyDate = $this->getChineseNewYear($year);
            if ($cnyDate) {
                $holidays[] = ['name' => 'Chinese New Year', 'date' => $cnyDate, 'type' => 'Special'];
            }

            // Easter-related holidays
            $easter = $this->calculateEaster($year);
            $maundyThursday = $easter->copy()->subDays(3);
            $goodFriday = $easter->copy()->subDays(2);
            $blackSaturday = $easter->copy()->subDays(1);

            $holidays[] = ['name' => 'Maundy Thursday', 'date' => $maundyThursday->format('Y-m-d'), 'type' => 'Regular'];
            $holidays[] = ['name' => 'Good Friday', 'date' => $goodFriday->format('Y-m-d'), 'type' => 'Regular'];
            $holidays[] = ['name' => 'Black Saturday', 'date' => $blackSaturday->format('Y-m-d'), 'type' => 'Special'];

            // Islamic Feasts (approximate dates, subject to proclamation)
            $eidFitrDate = $this->getEidAlFitr($year);
            if ($eidFitrDate) {
                $holidays[] = ['name' => 'Eid al-Fitr', 'date' => $eidFitrDate, 'type' => 'Regular'];
            }

            $eidAdhaDate = $this->getEidAlAdha($year);
            if ($eidAdhaDate) {
                $holidays[] = ['name' => 'Eid al-Adha', 'date' => $eidAdhaDate, 'type' => 'Regular'];
            }
        }

        // Insert holidays into database
        foreach ($holidays as $data) {
            Holiday::updateOrCreate(
                ['date' => $data['date'], 'name' => $data['name']],
                [
                    'type' => $data['type'],
                    'is_movable' => false,
                    'moved_date' => null,
                    'is_working_day' => false,
                ]
            );
        }

        $this->command->info('Successfully seeded holidays from 2025 to 2050.');
    }
}
