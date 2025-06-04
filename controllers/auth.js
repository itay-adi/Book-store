const crypto = require("crypto");

require('dotenv').config();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

const User = require("../models/user");
const { errorHandler } = require("./admin");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.API_KEY
    },
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password.",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (isPasswordMatch) {
      req.session.isLoggedIn = true;
      req.session.user = user;
      await req.session.save();

      return res.redirect("/");
    }

    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: "Invalid email or password.",
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: [],
    });
  } catch (err) {
    console.log("Error: " + err);
    res.redirect("/login");
  }
};

exports.postSignup = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(422).render("auth/signup", {
        path: "/signup",
        pageTitle: "Signup",
        errorMessage: "Email already exists, please use a different one.",
        oldInput: {
          email,
          password,
          confirmPassword: req.body.confirmPassword,
        },
        validationErrors: [],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email: email,
      password: hashedPassword,
      cart: { items: [] },
    });

    await user.save();
    await transporter.sendMail({
      to: email,
      from: "itayzxcv@gmail.com",
      subject: "Signup succeeded!",
      html: "<h1>You successfully signed up!</h1>",
    });

    res.redirect("/login");
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.postLogout = async (req, res, next) => {
  try {
    await req.session.destroy();

    res.redirect("/");
  } catch (err) {
    console.log("Error: " + err);
  }
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset",
    errorMessage: message,
  });
};

exports.postReset = async (req, res, next) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);

      return res.redirect("./reset");
    }

    try {
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
        req.flash("error", "No account with that email found.");

        return res.redirect("/reset");
      }

      const token = buffer.toString("hex");

      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 360000;

      await user.save();

      res.redirect("/");

      await transporter.sendMail({
        to: req.body.email,
        from: "itayzxcv@gmail.com",
        subject: "Password Reset",
        html: `
          <p>You requested a password reset!</p>
          <p>Click here <a href="http://localhost:3000/reset/${token}">link</a> to reset password</p>
        `,
      });
    } catch (err) {
      return errorHandler(err, next);
    }
  });
};

exports.getNewPassword = async (req, res, next) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    let message = req.flash("error");

    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }

    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New-Password",
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token,
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.postNewPassword = async (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  try {
    const user = await User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId,
    });

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;

    await user.save();

    res.redirect("/login");
  } catch (err) {
    return errorHandler(err, next);
  }
};
