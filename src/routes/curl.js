// curl -X PUT http://localhost:3000/api/users/update \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtEWVFlT095ZlJKdmlBS20tTG4zZzNxcEpxZTEtSjB3OFV4ZlpNRUtDbHcifQ.eyJzaWQiOiJjbWpvaHN0cGIwMnhxbDEwY3NxZnNqYzkyIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjY4NTE1NjEsImF1ZCI6ImNtamJia3pwbDAxcTRsZDBjaHc0enUxeHkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21qY3R2ZHIwMDBpaGxiMGNwNWJoZDMxdCIsImV4cCI6MTc2NjkzNzk2MX0.lJvpTAW0e525CQA7dhVqBPtgaTZrtXgDSwhPhKlEty6GaTIX-fhmfexplcW7uArW86ki_iFfjSXR4pYagaomMA" \
//   -d '{
//     "username": "NewUsername",
//     "country": "US",
//     "avatar_url": "https://example.com/avatar.jpg"
//   }'
  
// curl -X GET http://localhost:3000/api/users/get_user \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtEWVFlT095ZlJKdmlBS20tTG4zZzNxcEpxZTEtSjB3OFV4ZlpNRUtDbHcifQ.eyJzaWQiOiJjbWpvaHN0cGIwMnhxbDEwY3NxZnNqYzkyIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjY4NTE1NjEsImF1ZCI6ImNtamJia3pwbDAxcTRsZDBjaHc0enUxeHkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21qY3R2ZHIwMDBpaGxiMGNwNWJoZDMxdCIsImV4cCI6MTc2NjkzNzk2MX0.lJvpTAW0e525CQA7dhVqBPtgaTZrtXgDSwhPhKlEty6GaTIX-fhmfexplcW7uArW86ki_iFfjSXR4pYagaomMA" \
//   -d '{}'

// curl -X GET http://localhost:3000/api/friends/get-pending-requests \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtEWVFlT095ZlJKdmlBS20tTG4zZzNxcEpxZTEtSjB3OFV4ZlpNRUtDbHcifQ.eyJzaWQiOiJjbWpvbjFsb3QwM3o2a3owYzJqODk1MDNiIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjY4NjAzNjgsImF1ZCI6ImNtamJia3pwbDAxcTRsZDBjaHc0enUxeHkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21qY3R2ZHIwMDBpaGxiMGNwNWJoZDMxdCIsImV4cCI6MTc2Njk0Njc2OH0.LmeKhVehv5gNUPWWOelk_Kzz0L7jFWfXgoEfAW3TjuCW3hs5r1Y4sTQswIW7UEMW_31o1Tt_IwjIWCErBjt2Rg" \
//   -d '{}'


//   curl -X POST http://localhost:3000/api/friends/send-request \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtEWVFlT095ZlJKdmlBS20tTG4zZzNxcEpxZTEtSjB3OFV4ZlpNRUtDbHcifQ.eyJzaWQiOiJjbWpvbjFsb3QwM3o2a3owYzJqODk1MDNiIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjY4NjAzNjgsImF1ZCI6ImNtamJia3pwbDAxcTRsZDBjaHc0enUxeHkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21qY3R2ZHIwMDBpaGxiMGNwNWJoZDMxdCIsImV4cCI6MTc2Njk0Njc2OH0.LmeKhVehv5gNUPWWOelk_Kzz0L7jFWfXgoEfAW3TjuCW3hs5r1Y4sTQswIW7UEMW_31o1Tt_IwjIWCErBjt2Rg" \
//   -d '{
//     "to_user_id": "cmjn1kfsx01vkkz0cdurcowds"
//   }'

//   curl -X PUT http://localhost:3000/api/friends/accept-request \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtEWVFlT095ZlJKdmlBS20tTG4zZzNxcEpxZTEtSjB3OFV4ZlpNRUtDbHcifQ.eyJzaWQiOiJjbWpvdXA0NzMwMXRham8wYzd4ZGg0b2NhIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjY4NzMyMjMsImF1ZCI6ImNtamJia3pwbDAxcTRsZDBjaHc0enUxeHkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21qbjFrZnN4MDF2a2t6MGNkdXJjb3dkcyIsImV4cCI6MTc2Njk1OTYyM30.Ych4G77FbqeVFCmE__HVOmfTI8d_YlJAuZIABfSMvj1oxmB2RaRB9ZpHPYiFJ4hV1UpXMQwTXS94E1IaMXUEww" \
//   -d '{
//     "request_id": "26644055-3955-463d-849e-b8c44a33c4a5"
//   }'

//   curl -X DELETE http://localhost:3000/api/friends/cancel-request \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtEWVFlT095ZlJKdmlBS20tTG4zZzNxcEpxZTEtSjB3OFV4ZlpNRUtDbHcifQ.eyJzaWQiOiJjbWpvdXA0NzMwMXRham8wYzd4ZGg0b2NhIiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NjY4NzMyMjMsImF1ZCI6ImNtamJia3pwbDAxcTRsZDBjaHc0enUxeHkiLCJzdWIiOiJkaWQ6cHJpdnk6Y21qbjFrZnN4MDF2a2t6MGNkdXJjb3dkcyIsImV4cCI6MTc2Njk1OTYyM30.Ych4G77FbqeVFCmE__HVOmfTI8d_YlJAuZIABfSMvj1oxmB2RaRB9ZpHPYiFJ4hV1UpXMQwTXS94E1IaMXUEww" \
//   -d '{
//     "request_id": "26644055-3955-463d-849e-b8c44a33c4a5"
//   }'

