var crypto = require('crypto'),
  moment = require('moment'),
  Raven = require('raven');

var Sequelize = require('sequelize');
var Session = require('../models').Session;
var Op = Sequelize.Op;

var SESSION_VALIDITY_LENGTH = 7; // Initial session validity time
var SET_GRACE_WHEN = 5; // Set token expiry equal to grace period if session will expire in X days
var SESSION_GRACE_PERIOD = 7; // Should always be more than SET_GRACE_WHEN

//Checks if a token exists, and returns the corrosponding userId
exports.validateSession = function(token, type) {
  var query;
  if(typeof type == "string"){
    query = {
      type: type
    }
  } else {
    query = {
      type: { [Op.in]: type }
    }
  }
  query.token = token;
  query.expires = {[Op.gte]: Date.now() };

  return Session.findOne({
    where: query,
    attributes: ['id', 'userId', 'token', 'type', 'expires']
  })
  .then(function(session) {
    if (!session) {
      let e = new Error('Session is not valid!');
      e.status = 401;
      throw e;
    }

    extendSession(session);
    removeOldSessions();

    return Promise.resolve(session);
  });
};

function extendSession(session) {
  // Extend the session expiry if necessary
  if (moment(session.expires).subtract(SET_GRACE_WHEN, "days").isBefore(moment())) {
    var updateCmd = {
      // updatedAt: Date.now(),
      expires: moment().add(SESSION_GRACE_PERIOD, "days")
    }

    session.update(updateCmd).catch(function (err) {
      var payload = {
        msg: "Error reading database when extending user token!",
        err: err
      }
      Raven.captureException(payload);
    });
  }
}

function removeOldSessions() {
  //Clean out all old items
  var removeOld = {
    expires: { [Op.lt]: Date.now() }
  }

  return Session.destroy({
    where: removeOld
  }).catch(function (err) {
    if (err) {
      var payload = {
        msg: "Error removing old sessions!",
        err: err
      }
      Raven.captureException(payload);
    }
  });
}

//Creates a token and returns the token if successful
exports.generateSession = function(userId, type, transaction) {
  //Create a random token
  var token = crypto.randomBytes(48).toString('hex');
  //New session!
  return Session.create({
    userId,
    type,
    token,
    expires: moment().add(SESSION_VALIDITY_LENGTH, "days")
  }, { transaction }).then(session => {
    return Promise.resolve(session);
  });
};

exports.deleteSession = function(token) {
  return Session.destroy({
    where: {
      token: token
    }
  });
};
