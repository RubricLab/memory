-- @param {String} $1:id
-- @param {String} $2:body
-- @param $3:vector
-- @param {String} $4:userId
insert into tag (id, body, vector, "userId")
values ($1, $2, $3, $4)
on conflict (body, "userId") do nothing
returning id