const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../helpers/email/sendMail");
const tokenSignUp = require("../helpers/email/templates/sendTokenSignUp");
const newPassword = require("../helpers/email/templates/forgotPassword");
const secretJwt = process.env.JWT_CRYPTEX;
const userApiKey = process.env.USER_API_KEY;
const adminApiKey = process.env.ADMIN_API_KEY;
const apiDomain = process.env.API_DOMAIN;
const clientDomain = process.env.CLIENT_DOMAIN;

const User = require("../models/user");
const Post = require("../models/post");

/* Allows a new user to register */
exports.signUp = async (req, res, next) => {
  const { key } = req.query;
  const { email, pseudo, password } = req.body;

  try {
    if (key === userApiKey || key === adminApiKey) {
      const existingUser = await User.findOne({ pseudo: pseudo });
      if (existingUser) {
        return res.status(403).json({
          message: `Un utilisateur ${pseudo} existe déjà...`
        });
      }

      const hash = await bcrypt.hash(password, 10);

      const user = new User({
        email: email,
        pseudo: pseudo,
        password: hash
      });

      const result = await user.save();
      const tokenInfo = {
        id: result._id,
        expiresIn: "1d",
        key: key
      };
      const token = await jwt.sign(tokenInfo, secretJwt);

      const mailSent = await sendEmail(tokenSignUp(email, `${apiDomain}/auth/confirmation/${token}`));
      return res.status(201).json({
        message: "Veuillez verifier votre boite mail",
        result: mailSent
      });
    } else {
      return res.status(403).json({
        message: "Veuillez entrer une clé valide..."
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: `Inscription impossible...${error.message}`
    });
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const foudUser = await User.findOne({
      _id: req.userData.userId,
      isActive: true
    });
    const userPosts = await Post.find({ creator_id: foudUser._id });
    return res.status(200).json({
      message: "Utilisateur trouvé",
      data: foudUser,
      posts: userPosts.length
    });
  } catch (error) {
    res.status(403).json({
      message: "Aucun utilisateur actif présent en base de données"
    });
  }
};

exports.updatePseudo = async (req, res, next) => {
  const isPseudoAvailable = await User.find({ pseudo: req.body.data });
  if (!isPseudoAvailable) {
    return res.status(401).json({
      message: "Ce pseudo n'est pas disponnible"
    });
  }
  try {
    const result = await User.findOneAndUpdate(
      { _id: req.userData.userId },
      { pseudo: req.body.pseudo }
    );
    return res.status(200).json({
      message: "Nouveau pseudo crée avec succès",
      data: result
    });
  } catch (error) {
    res.status(403).json({
      message: "Aucun utilisateur actif présent en base de données"
    });
  }
};

exports.confirmation = (req, res, next) => {
  const { token } = req.params;
  const decode = jwt.verify(token, secretJwt);

  try {
    const { id, key } = decode;
    const update =
      key === adminApiKey
        ? { isActive: "true", isAdmin: "true" }
        : { isActive: "true", isAdmin: "false" };

    User.updateOne({ _id: id }, update, (err, raw) => {
      if (err) {
        console.log(err);
      } else {
        console.log(raw);
      }
    });
    res.status(200);
    res.redirect(`${clientDomain}/auth/login`);
  } catch {
    res.redirect(`${clientDomain}`);
    res.status(403).json({
      message: "Activation impossible"
    });
  }
};

exports.newPasswordAsk = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await User.findOne({ email: email });
    if (result.isActive === false) {
      return res.status(403).json({
        message: "Cet utilisateur ne possède pas de compte actif..."
      });
    }

    const tokenInfo = {
      userId: result._id,
      email,
      hash: result.password,
      expiresIn: "1h"
    };
    const token = jwt.sign(tokenInfo, secretJwt);
    sendEmail(newPassword(email, `${clientDomain}/auth/newpassword/${token}`));
    return res.status(200).json({
      message: "Email envoyé"
    });
  } catch (error) {
    return res.status(403).json({
      message: "L' utilisateur n'existe pas"
    });
  }
};

exports.updateNotifStatus = async (req, res, next) => {
  const status = req.body.newStatus;
  try {
    await User.findOneAndUpdate(
      { _id: req.userData.userId },
      { $set: { notifications: status } }
    );
    return res.status(200).json({
      message: "Modifié",
      status: status
    });
  } catch (error) {
    res.status(401).json({
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const deletedUser = await User.findOneAndUpdate(
      { _id: req.userData.userId },
      { $set: { isAdmin: false, isActive: false, isDeleted: true } }
    );
    return res.status(200).json({
      message: "Modifié",
      status: deletedUser.isDeleted
    });
  } catch (error) {
    res.status(401).json({
      message: error.message
    });
  }
};

exports.newPasswordSet = async (req, res, next) => {
  const { password, passwordBis } = req.body;
  const { email } = req.userData;

  if (password !== passwordBis) {
    return res.status(403).json({
      message: `Les mots de passe ne sont pas identiques...${password}${passwordBis}`
    });
  }
  try {
    const result = await User.findOne({ email: email });
    if (result.email === email && result.isActive === true) {
      const hash = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate({ _id: result._id, password: hash });
      return res.status(200).json({
        message: "Nouveau mot de passe crée"
      });
    }
  } catch (error) {
    return res.status(400);
  }
};

exports.signIn = async (req, res, next) => {
  const fetchedUser = await User.findOne({ email: req.body.email });
  if (!fetchedUser.isActive) {
    if (fetchedUser.isDeleted) {
      return res.status(403).json({
        message: "Ce compte à été supprimé par l'utilisateur..."
      });
    }
    return res.status(401).json({
      message: "Vous n'avez pas encore activé votre compte..."
    });
  }
  try {
    const allowedUser = await bcrypt.compare(
      req.body.password,
      fetchedUser.password
    );
    if (allowedUser) {
      const token = jwt.sign(
        {
          email: fetchedUser.email,
          userId: fetchedUser._id,
          isAdmin: fetchedUser.isAdmin
        },
        secretJwt,
        { expiresIn: "1h" }
      );
      return res.status(200).json({
        token: token,
        expiresIn: 3600,
        userId: fetchedUser._id,
        isAdmin: fetchedUser.isAdmin
      });
    } else {
      return res.status(403).json({
        message: "Authentification impossible... Mot de passe incorrect"
      });
    }
  } catch {
    return res.status(403).json({
      message: "Authentification impossible... L' utilisateur n'existe pas"
    });
  }
};
