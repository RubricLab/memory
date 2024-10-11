-- @param $1:vector
-- @param {Int} $2:threshold
-- @param {Float} $3:limit
select id, body, similarity
from (
  select id, body, 1 - (vector <=> $1::vector) as similarity
  from tag
) as subquery
where similarity > $2
order by similarity desc
limit $3;
