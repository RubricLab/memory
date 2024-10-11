-- @param {String} $1:id
-- @param {String} $2:body
-- @param $3:vector
insert into tag (id, body, vector)
values ($1, $2, $3)
on conflict (body) do nothing
returning id