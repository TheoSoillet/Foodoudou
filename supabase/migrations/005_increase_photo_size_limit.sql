-- Increase photo upload limit for dish images.

update storage.buckets
set file_size_limit = 20971520
where id = 'restaurant-photos';
