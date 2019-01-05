var SessionService = require('../services/sessions');
var User = require('../models').User;

exports.validateSession = function(types) {
  return function(req, res, next) {
    SessionService.validateSession(req.query.token, types).then(session => {
      res.locals.session = session;
      next();
    }).catch(next);
  }
};

// Requires validateSession
exports.validateUser = function(req, res, next) {
  User.find({
    where: {
      id: res.locals.session.userId
    },
    attributes: ['id', 'name', 'email', 'createdAt', 'updatedAt']
  }).then(user => {
    if (!user) {
      res.status(404).send("Your user was not found");
    } else {
      res.locals.user = user;
      next();
    }
  }).catch(function(err) {
    res.status(500).json(err);
  });
};
