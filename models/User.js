const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$exampleHashedPassword', // bcrypt hash for 'password'
    role: 'admin'
  }
];

module.exports = users;
