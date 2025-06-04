const { validationResult } = require("express-validator");
const fileHelper = require("../util/file");

const Product = require("../models/product");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/edit-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "Attached file is not an image",
      validationErrors: [],
    });
  }

  const imageUrl = image.path;

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/edit-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        imageUrl: imageUrl,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  const product = new Product({
    title,
    price,
    description,
    imageUrl,
    userId: req.user,
  });

  try {
    await product.save();

    console.log("Product created successfully");
    res.redirect("/admin/products");
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.getEditProduct = async (req, res, next) => {
  const editMode = req.query.edit;

  if (!editMode) {
    return res.redirect("/");
  }

  const productId = req.params.productId;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.redirect("/");
    }

    res.render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: editMode,
      product: product,
      hasError: false,
      errorMessage: null,
      validationErrors: [],
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.postEditProduct = async (req, res, next) => {
  const productId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedImage = req.file;
  const updatedDescription = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDescription,
        _id: productId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  try {
    const product = await Product.findById(productId);

    if (!product.userId.equals(req.user._id)) {
      return res.redirect("/");
    }

    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDescription;

    if (updatedImage) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = updatedImage.path;
    }

    await product.save();

    res.redirect("/admin/products");
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ userId: req.user });

    res.render("admin/products", {
      prods: products,
      pageTitle: "Admin Products",
      path: "/admin/products",
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const productId = req.params.productId;

  try {
    const product = await Product.findById(productId);
    await Product.deleteOne({ _id: productId, userId: req.user });

    fileHelper.deleteFile(product.imageUrl);

    res.status(200).json({ message: "Success!" });
  } catch (err) {
    res.status(500).json({ message: "Deleting product failed!" });
  }
};

exports.errorHandler = (err, next) => {
  console.log(err)
  const error = new Error(err);
  error.httpStatusCode = 500;

  return next(error);
};
