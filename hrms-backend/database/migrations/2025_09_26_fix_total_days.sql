-- Fix total_days for existing leave requests where total_days is 0 or NULL
-- This will recalculate total_days based on the from and to dates

UPDATE leave_requests 
SET total_days = DATEDIFF(`to`, `from`) + 1
WHERE (total_days IS NULL OR total_days = 0) 
  AND `from` IS NOT NULL 
  AND `to` IS NOT NULL;

-- Also update total_hours if it's 0 or NULL (assuming 8 hours per day)
UPDATE leave_requests 
SET total_hours = total_days * 8
WHERE (total_hours IS NULL OR total_hours = 0) 
  AND total_days IS NOT NULL 
  AND total_days > 0;