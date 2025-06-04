const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 3;

const { errorHandler } = require("./admin");
const product = require("../models/product");

exports.getProducts = async (req, res, next) => {
  const page = +req.query.page || 1;

  try {
    const numOfProducts = await Product.countDocuments();
    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render("shop/product-list", {
      prods: products,
      pageTitle: "All Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < numOfProducts,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(numOfProducts / ITEMS_PER_PAGE),
    });
  } catch (err) {
    console.log(err);
    return errorHandler(err, next);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;

  try {
    const product = await Product.findById(prodId);

    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.title,
      path: "/products",
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.getIndex = async (req, res, next) => {
  const page = +req.query.page || 1;
  try {
    const numOfProducts = await Product.countDocuments();

    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render("shop/index", {
      prods: products,
      pageTitle: "Shop",
      path: "/",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < numOfProducts,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(numOfProducts / ITEMS_PER_PAGE),
    });
  } catch (err) {
    console.log(err);
    return errorHandler(err, next);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const products = await req.user.populate("cart.items.productId");

    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: products.cart.items,
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.postCart = async (req, res, next) => {
  const prodId = req.body.productId;

  try {
    const product = await Product.findById(prodId);

    await req.user.addToCart(product);

    res.redirect("/cart");
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;

  try {
    await req.user.removeFromCart(prodId);

    res.redirect("/cart");
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.getCheckout = async (req, res, next) => {
  try {
    const products = await req.user.populate("cart.items.productId");
    let totalSum = 0;

    products.cart.items.forEach((item) => {
      totalSum += item.quantity * item.productId.price;
    });

    res.render("shop/checkout", {
      path: "/checkout",
      pageTitle: "Checkout",
      products: products.cart.items,
      totalSum: totalSum,
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.postOrder = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items.map((item) => {
      return {
        quantity: item.quantity,
        product: { ...item.productId._doc },
      };
    });

    const order = new Order({
      user: {
        email: req.user.email,
        userId: user._id,
      },
      products,
    });

    await order.save();
    await req.user.clearCart();

    res.redirect("/orders");
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.session.user._id });

    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders: orders,
    });
  } catch (err) {
    return errorHandler(err, next);
  }
};

exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = "invoice-" + orderId + ".pdf";
  const invoicePath = path.join("data", "invoices", invoiceName);

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return next(new Error("No order found."));
    }

    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("Unauthorized."));
    }

    const pdfDoc = new PDFDocument();
    let totalPrice = 0;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + invoiceName + '"'
    );

    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(26).text("Invoice", {
      underline: true,
    });

    pdfDoc.text("--------------------------------");

    order.products.forEach((prod) => {
      totalPrice += prod.product.price * prod.quantity;
      pdfDoc
        .fontSize(14)
        .text(
          `${prod.product.title} - ${prod.quantity} x $${prod.product.price}`
        );
    });
    pdfDoc.text("----------------");
    pdfDoc.text(`Total Price: $${totalPrice}`);
    pdfDoc.end();
  } catch (err) {
    return errorHandler(err, next);
  }
};
