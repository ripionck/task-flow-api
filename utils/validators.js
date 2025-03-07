// Input validation helpers
exports.validateEmail = (email) => {
  const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

exports.validatePassword = (password) => {
  return password.length >= 6;
};
