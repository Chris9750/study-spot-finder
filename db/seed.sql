-- Sample data around Queen's University, Kingston. Coordinates are approximate;
-- replace with your own campus's spots.
TRUNCATE spots RESTART IDENTITY CASCADE;

INSERT INTO spots (name, building, description, lat, lng) VALUES
  ('Stauffer 4th Floor',        'Stauffer Library',  'Silent study floor with long tables and carrels.', 44.22830, -76.49605),
  ('Stauffer Main Floor',       'Stauffer Library',  'Group-friendly tables near the entrance. Busy midday.', 44.22818, -76.49590),
  ('Douglas Reading Room',      'Douglas Library',   'Old-school reading room. Beautiful, very quiet, few outlets.', 44.22768, -76.49520),
  ('ARC Lounge',                'ARC',               'Open seating by the food court. Loud but always has a seat.', 44.22835, -76.49800),
  ('Mitchell Hall Commons',     'Mitchell Hall',     'Bright atrium with lots of outlets and good Wi-Fi.', 44.22795, -76.49320),
  ('Goodes Hall Atrium',        'Goodes Hall',       'Quiet tables upstairs; can fill up during business-school events.', 44.22620, -76.49775);

INSERT INTO reviews (spot_id, noise, wifi, outlets, busyness, comment, author_name, created_at) VALUES
  (1, 1, 4, 4, 3, 'Truly silent. Get there before 11.',          'Maya',  now() - INTERVAL '3 days'),
  (1, 1, 5, 3, 4, 'Packed during exams but great focus.',        'Dev',   now() - INTERVAL '1 hour'),
  (2, 3, 4, 3, 4, 'Fine for group work.',                        'Sam',   now() - INTERVAL '2 days'),
  (3, 1, 3, 1, 2, 'Bring a charged laptop - almost no outlets.', 'Priya', now() - INTERVAL '5 days'),
  (3, 2, 3, 2, 2, NULL,                                          'Alex',  now() - INTERVAL '30 minutes'),
  (4, 5, 3, 2, 5, 'Too loud for reading, ok for emails.',        'Jordan',now() - INTERVAL '1 day'),
  (5, 3, 5, 5, 3, 'Outlets everywhere. Best Wi-Fi on campus.',   'Lee',   now() - INTERVAL '4 hours'),
  (5, 2, 5, 5, 2, NULL,                                          'Nina',  now() - INTERVAL '20 minutes'),
  (6, 2, 4, 3, 2, 'Underrated. Upstairs is the move.',           'Omar',  now() - INTERVAL '6 days');
