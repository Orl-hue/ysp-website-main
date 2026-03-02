-- Seed contact + stats
insert into contact_details (id, email, facebook, mobile, location, instagram)
values (
  1,
  'hello@youthserviceph.org',
  'https://www.facebook.com/YouthServicePH',
  '0917 000 0000',
  'Philippines Nationwide',
  'https://www.instagram.com/YouthServicePH'
)
on conflict (id) do update set
  email = excluded.email,
  facebook = excluded.facebook,
  mobile = excluded.mobile,
  location = excluded.location,
  instagram = excluded.instagram;

insert into site_stats (id, projects_count, chapters_count, members_count)
values (1, 6, 6, 1850)
on conflict (id) do update set
  projects_count = excluded.projects_count,
  chapters_count = excluded.chapters_count,
  members_count = excluded.members_count;

-- Chapters
insert into chapters (
  id,
  name,
  region,
  location,
  description,
  chapter_head_name,
  chapter_head_email,
  chapter_head_phone
) values
  ('11111111-1111-1111-1111-111111111111', 'Metro Manila Chapter', 'NCR', 'Quezon City, Metro Manila',
   'Supports nationwide partnerships, youth leadership training, and policy dialogue initiatives.',
   'Metro Manila Chapter Head', 'manila@ysp.local', '09170000001'),
  ('22222222-2222-2222-2222-222222222222', 'Baguio Chapter', 'Luzon', 'Baguio City, Benguet',
   'Leads upland community service, cultural learning exchanges, and youth civic engagement.',
   'Baguio Chapter Head', 'baguio@ysp.local', '09170000002'),
  ('33333333-3333-3333-3333-333333333333', 'Cebu Chapter', 'Visayas', 'Cebu City, Cebu',
   'Coordinates coastal cleanup drives and leadership workshops across Cebu province.',
   'Cebu Chapter Head', 'cebu@ysp.local', '09170000003'),
  ('44444444-4444-4444-4444-444444444444', 'Iloilo Chapter', 'Visayas', 'Iloilo City, Iloilo',
   'Runs learning hubs and skills development programs for youth volunteers.',
   'Iloilo Chapter Head', 'iloilo@ysp.local', '09170000004'),
  ('55555555-5555-5555-5555-555555555555', 'Davao Chapter', 'Mindanao', 'Davao City, Davao del Sur',
   'Delivers health outreach caravans and community resilience campaigns in Mindanao.',
   'Davao Chapter Head', 'davao@ysp.local', '09170000005'),
  ('66666666-6666-6666-6666-666666666666', 'Tagum Chapter', 'Mindanao', 'Tagum City, Davao del Norte',
   'Leads youth-led outreach, learning hubs, and community resilience drives across Tagum City.',
   'Tagum Chapter Head', 'tagum@ysp.local', '09170000006')
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region,
  location = excluded.location,
  description = excluded.description,
  chapter_head_name = excluded.chapter_head_name,
  chapter_head_email = excluded.chapter_head_email,
  chapter_head_phone = excluded.chapter_head_phone;

-- Programs
insert into programs (
  id,
  title,
  description,
  image_url,
  featured
) values
  ('77777777-7777-7777-7777-777777777777', 'National Youth Leadership Summit',
   'An annual gathering that trains youth leaders in governance, advocacy, and community-building across the Philippines.',
   'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&auto=format&fit=crop', true),
  ('88888888-8888-8888-8888-888888888888', 'Community Learning Hubs Network',
   'A nationwide network of learning hubs supporting after-school mentoring and literacy programs.',
   'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&auto=format&fit=crop', true),
  ('99999999-9999-9999-9999-999999999999', 'Coastal Cleanup Brigades',
   'Youth-led environmental cleanups and coastal protection campaigns in key shoreline communities.',
   'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&auto=format&fit=crop', false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Youth Health Caravan',
   'Mobile health and wellness outreach supporting community clinics and health education.',
   'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&auto=format&fit=crop', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Community Resilience Labs',
   'Disaster readiness training, psychosocial support sessions, and response drills in partner cities.',
   'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1200&auto=format&fit=crop', false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Digital Literacy Caravan',
   'Mobile digital skills training for students, youth leaders, and local volunteers.',
   'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop', false)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  featured = excluded.featured;

-- Opportunities
insert into opportunities (
  id,
  event_name,
  date,
  chapter_id,
  sdgs_impacted,
  contact_name,
  contact_email,
  contact_phone,
  details,
  volunteer_limit,
  volunteer_filled
) values
  ('10101010-1010-1010-1010-101010101010', 'Metro Manila Youth Tech Camp', '2026-03-15',
   '11111111-1111-1111-1111-111111111111', ARRAY['SDG 4','SDG 9'],
   'Metro Manila Chapter Head', 'manila@ysp.local', '09170000001',
   'Support digital literacy workshops and mentoring sessions for senior high students.', 40, 32),
  ('20202020-2020-2020-2020-202020202020', 'Baguio Eco Trail Cleanup', '2026-03-28',
   '22222222-2222-2222-2222-222222222222', ARRAY['SDG 11','SDG 15'],
   'Baguio Chapter Head', 'baguio@ysp.local', '09170000002',
   'Join volunteers for upland trail cleanups and environmental awareness sessions.', 60, 45),
  ('30303030-3030-3030-3030-303030303030', 'Cebu Coastal Cleanup Day', '2026-04-06',
   '33333333-3333-3333-3333-333333333333', ARRAY['SDG 13','SDG 14'],
   'Cebu Chapter Head', 'cebu@ysp.local', '09170000003',
   'Help organize coastal cleanups and community waste segregation activities.', 50, 18),
  ('40404040-4040-4040-4040-404040404040', 'Iloilo Learning Hub Launch', '2026-04-20',
   '44444444-4444-4444-4444-444444444444', ARRAY['SDG 4','SDG 10'],
   'Iloilo Chapter Head', 'iloilo@ysp.local', '09170000004',
   'Support the opening of a community learning hub and literacy mentoring.', 25, 10),
  ('50505050-5050-5050-5050-505050505050', 'Davao Community Health Drive', '2026-05-04',
   '55555555-5555-5555-5555-555555555555', ARRAY['SDG 3'],
   'Davao Chapter Head', 'davao@ysp.local', '09170000005',
   'Assist with health screening booths and wellness education sessions.', 30, 28),
  ('60606060-6060-6060-6060-606060606060', 'Tagum Community Resilience Training', '2026-05-18',
   '66666666-6666-6666-6666-666666666666', ARRAY['SDG 11','SDG 13'],
   'Tagum Chapter Head', 'tagum@ysp.local', '09170000006',
   'Help facilitate disaster preparedness drills and youth volunteer training.', 35, 35)
on conflict (id) do update set
  event_name = excluded.event_name,
  date = excluded.date,
  chapter_id = excluded.chapter_id,
  sdgs_impacted = excluded.sdgs_impacted,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  details = excluded.details,
  volunteer_limit = excluded.volunteer_limit,
  volunteer_filled = excluded.volunteer_filled;

