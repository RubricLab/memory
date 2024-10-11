-- @param $1:vector
-- @param {Int} $2:threshold
-- @param {Float} $3:limit
-- @param {String} $4:userId
select id, body, similarity
from (
  select id, body, 1 - (vector <=> $1::vector) as similarity
  from tag
  where "userId" = $4
) as subquery
where similarity > $2
order by similarity desc
limit $3;
