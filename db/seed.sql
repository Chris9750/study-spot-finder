-- Sample data around Queen's University, Kingston. Coordinates and hours are
-- approximate; replace with your own campus's spots.
TRUNCATE spots, reviews, photos, reports RESTART IDENTITY CASCADE;

INSERT INTO spots (name, building, description, lat, lng, hours, bookable, booking_url, food_nearby, accessible) VALUES
  ('Stauffer 4th Floor', 'Stauffer Library', 'Silent study floor with long tables and carrels.', 44.22830, -76.49605,
   '{"mon":{"open":"08:00","close":"02:00"},"tue":{"open":"08:00","close":"02:00"},"wed":{"open":"08:00","close":"02:00"},"thu":{"open":"08:00","close":"02:00"},"fri":{"open":"08:00","close":"22:00"},"sat":{"open":"10:00","close":"22:00"},"sun":{"open":"10:00","close":"02:00"}}',
   true, 'https://library.queensu.ca', true, true),
  ('Stauffer Main Floor', 'Stauffer Library', 'Group-friendly tables near the entrance. Busy midday.', 44.22818, -76.49590,
   '{"mon":{"open":"08:00","close":"02:00"},"tue":{"open":"08:00","close":"02:00"},"wed":{"open":"08:00","close":"02:00"},"thu":{"open":"08:00","close":"02:00"},"fri":{"open":"08:00","close":"22:00"},"sat":{"open":"10:00","close":"22:00"},"sun":{"open":"10:00","close":"02:00"}}',
   false, NULL, true, true),
  ('Douglas Reading Room', 'Douglas Library', 'Old-school reading room. Beautiful, very quiet, few outlets.', 44.22768, -76.49520,
   '{"mon":{"open":"08:30","close":"22:00"},"tue":{"open":"08:30","close":"22:00"},"wed":{"open":"08:30","close":"22:00"},"thu":{"open":"08:30","close":"22:00"},"fri":{"open":"08:30","close":"18:00"},"sat":null,"sun":{"open":"12:00","close":"22:00"}}',
   false, NULL, false, false),
  ('ARC Lounge', 'ARC', 'Open seating by the food court. Loud but always has a seat.', 44.22835, -76.49800,
   '{"mon":{"open":"07:00","close":"23:00"},"tue":{"open":"07:00","close":"23:00"},"wed":{"open":"07:00","close":"23:00"},"thu":{"open":"07:00","close":"23:00"},"fri":{"open":"07:00","close":"23:00"},"sat":{"open":"09:00","close":"21:00"},"sun":{"open":"09:00","close":"21:00"}}',
   false, NULL, true, true),
  ('Mitchell Hall Commons', 'Mitchell Hall', 'Bright atrium with lots of outlets and good Wi-Fi.', 44.22795, -76.49320,
   '{"mon":{"open":"00:00","close":"24:00"},"tue":{"open":"00:00","close":"24:00"},"wed":{"open":"00:00","close":"24:00"},"thu":{"open":"00:00","close":"24:00"},"fri":{"open":"00:00","close":"24:00"},"sat":{"open":"00:00","close":"24:00"},"sun":{"open":"00:00","close":"24:00"}}',
   true, 'https://www.queensu.ca', true, true),
  ('Goodes Hall Atrium', 'Goodes Hall', 'Quiet tables upstairs; can fill up during business-school events.', 44.22620, -76.49775,
   NULL, false, NULL, false, true);

-- A month of ratings per spot so the busy-by-hour chart has a shape:
-- busier around lunch (11-14) and early evening, quieter early and late.
INSERT INTO reviews (spot_id, noise, wifi, outlets, busyness, author_name, created_at)
SELECT
  s.id,
  LEAST(5, GREATEST(1, base.noise + (random() * 2 - 1)::INT)),
  LEAST(5, GREATEST(1, base.wifi + (random() * 2 - 1)::INT)),
  LEAST(5, GREATEST(1, base.outlets + (random() * 2 - 1)::INT)),
  LEAST(5, GREATEST(1,
    base.busy
    + CASE WHEN h BETWEEN 11 AND 14 THEN 2 WHEN h BETWEEN 17 AND 19 THEN 1
           WHEN h < 10 OR h > 21 THEN -1 ELSE 0 END
    + (random() * 2 - 1)::INT)),
  NULL,
  -- created at hour h (Toronto time) on a random day in the last 30 days
  (date_trunc('day', now() AT TIME ZONE 'America/Toronto') - (d || ' days')::INTERVAL
     + (h || ' hours')::INTERVAL + (floor(random() * 60) || ' minutes')::INTERVAL)
    AT TIME ZONE 'America/Toronto'
FROM spots s
JOIN (VALUES (1,1,4,4,3), (2,3,4,3,3), (3,1,3,1,2), (4,5,3,2,4), (5,3,5,5,2), (6,2,4,3,2))
  AS base(id, noise, wifi, outlets, busy) ON base.id = s.id
CROSS JOIN generate_series(1, 45) AS rep
CROSS JOIN LATERAL (SELECT 8 + floor(random() * 15)::INT AS h, 1 + floor(random() * 29)::INT AS d, rep + s.id AS r) t;

-- A few named ratings with comments, including recent ones for "busy now".
INSERT INTO reviews (spot_id, noise, wifi, outlets, busyness, comment, author_name, created_at) VALUES
  (1, 1, 4, 4, 3, 'Truly silent. Get there before 11.',          'Maya',   now() - INTERVAL '3 days'),
  (1, 1, 5, 3, 4, 'Packed during exams but great focus.',        'Dev',    now() - INTERVAL '1 hour'),
  (2, 3, 4, 3, 4, 'Fine for group work.',                        'Sam',    now() - INTERVAL '2 days'),
  (3, 1, 3, 1, 2, 'Bring a charged laptop - almost no outlets.', 'Priya',  now() - INTERVAL '5 days'),
  (3, 2, 3, 2, 2, NULL,                                          'Alex',   now() - INTERVAL '30 minutes'),
  (4, 5, 3, 2, 5, 'Too loud for reading, ok for emails.',        'Jordan', now() - INTERVAL '1 day'),
  (5, 3, 5, 5, 3, 'Outlets everywhere. Best Wi-Fi on campus.',   'Lee',    now() - INTERVAL '4 hours'),
  (5, 2, 5, 5, 2, NULL,                                          'Nina',   now() - INTERVAL '20 minutes'),
  (6, 2, 4, 3, 2, 'Underrated. Upstairs is the move.',           'Omar',   now() - INTERVAL '6 days');
