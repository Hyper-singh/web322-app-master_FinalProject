/*********************************************************************************
*  WEB322 – Assignment 06
*  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part of this
*  assignment has been copied manually or electronically from any other source (including web sites) or 
*  distributed to other students.
* 
*  Name: Manveer Singh Student ID: 161626213
*
*  Cyclic Web App URL: https://calm-gold-leopard-cape.cyclic.cloud/
*
*  GitHub Repository URL: https://github.com/Hyper-singh/web322-app-master_FinalProject
*
********************************************************************************/ 


const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const clientSessions = require('client-sessions');
const store_service = require('./store-service.js');
const authData = require('./auth-service.js');

const app = express();
const port = process.env.PORT || 8080;

// Configure cloudinary
cloudinary.config({
  cloud_name: "dcwbyqvgb",
  api_key: "933755614558528",
  api_secret: "N6K3U91Z_pQNSsNNQ9xndhUGdIQ",
  secure: true,
});

// Configure multer for file upload
const upload = multer();

// Set up Handlebars
const hbs = exphbs.create({
  extname: '.hbs',
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// Set up body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize data and authentication
store_service.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(`Unable to start server: ${err}`);
  });

// Serve static files from the "public" directory
app.use(express.static('public'));

// Configure client-sessions middleware
app.use(clientSessions({
  cookieName: 'session',
  secret: 'your-secret-key', 
  duration: 24 * 60 * 60 * 1000, // Session duration in milliseconds (1 day)
  activeDuration: 1000 * 60 * 5, // Session refresh duration in milliseconds (5 minutes)
}));

// Set session data for templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Custom middleware to set activeRoute and viewingCategory
app.use(function(req, res, next){
  let route = req.path.substring(1);
  app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

// Handlebars custom helpers

// Register navLink helper for generating navigation links
hbs.handlebars.registerHelper('navLink', function (url, options) {
  return (
    '<li class="nav-item"><a ' + 
    (url ==  app.locals.activeRoute ? ' class="nav-link active" ' : 'class="nav-link" ') + 
    'href="' +
    url +
    '">' +
    options.fn(this) +
    "</a></li>"
  );
});

// Register equal helper for equality comparison
hbs.handlebars.registerHelper('equal', function (lvalue, rvalue, options) {
  if (arguments.length < 3) {
    throw new Error("Handlebars Helper equal needs 2 parameters");
  }
  if (lvalue != rvalue) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

// Route handlers

// Render login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Render registration page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle user registration
app.post('/register', (req, res) => {
  authData.registerUser(req.body)
    .then(() => {
      res.render('register', { successMessage: 'User created' });
    })
    .catch((err) => {
      res.render('register', { errorMessage: err, userName: req.body.userName });
    });
});

// Handle user login
app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory,
      };
      res.redirect('/items');
    })
    .catch((err) => {
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

// Handle user logout
app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

// Render user history page (requires login)
app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

// Redirect root path to login page
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Render about page
app.get("/about", (req, res) => {
  res.render('about');
});

// Render add item page with categories
app.get("/items/add", (req, res) => {
  store_service.getCategories()
    .then((categories) => {
      res.render('addItem', { categories: categories });
    })
    .catch((error) => {
      console.error("Failed to fetch categories:", error);
      res.render('addItem', { categories: [] });
    });
});

// Render add category page
app.get("/categories/add", (req, res) => {
  res.render('addCategory');
});

// Render shop page with items and categories
app.get("/shop", async (req, res) => {
  let viewData = {};

  try {
    let items = [];

    if (req.query.category) {
      items = await store_service.getPublishedItemsByCategory(req.query.category);
    } else {
      items = await store_service.getPublishedItems();
    }

    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    viewData.items = items;

    if (viewData.items.length === 0) {
      viewData.message = "No outcome detected.";
    }
  } catch (err) {
    viewData.message = "No outcome detected.";
  }

  try {
    let categories = await store_service.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "No outcome detected.";
  }

  res.render("shop", { data: viewData });
});

// Render items based on filters
app.get("/items", (req, res) => {
  const { category, minDate } = req.query;

  if (category) {
    store_service
      .getItemsByCategory(category)
      .then((items) => {
        res.render("items", { items: items });
      })
      .catch((error) => {
        res.render("items", { message: "No outcome detected." });
      });
  } else if (minDate) {
    store_service
      .getItemsByMinDate(minDate)
      .then((items) => {
        res.render("items", { items: items });
      })
      .catch((error) => {
        res.render("items", { message: "No outcome detected." });
      });
  } else {
    store_service
      .getAllItems()
      .then((items) => {
        res.render("items", { items: items });
      })
      .catch((error) => {
        res.render("items", { message: "No outcome detected." });
      });
  }
});

// Render item details page
app.get("/item/:id", (req, res) => {
  const itemId = req.params.id;

  store_service
    .getItemById(itemId)
    .then((item) => {
      res.send(item);
    })
    .catch((error) => {
      res.send({ message: error });
    });
});

// Render categories page
app.get("/categories", (req, res) => {
  store_service
    .getCategories()
    .then((categories) => {
      if (categories.length === 0) {
        res.render("categories", { message: "No outcome detected." });
      } else {
        res.render("categories", { categories: categories });
      }
    })
    .catch((error) => {
      res.render("categories", { message: "No outcome detected." });
    });
});

// Handle adding an item
app.post('/items/add', upload.single('featureImage'), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function uploadToCloudinary(req) {
      try {
        let uploaded = await streamUpload(req);
        processItem(uploaded.url);
      } catch (error) {
        console.error(error);
      }
    }

    uploadToCloudinary(req);
  } else {
    processItem('');
  }

  function processItem(imageUrl) {
    req.body.featureImage = imageUrl;

    store_service.addItem(req.body)
      .then((newItem) => {
        console.log("New item added:", newItem);
        res.redirect('/items');
      })
      .catch((error) => {
        console.error("Failed to add item:", error);
        res.redirect('/items');
      });
  }
});

// Handle adding a category
app.post('/categories/add', (req, res) => {
  store_service.addCategory(req.body)
    .then(() => {
      res.redirect('/categories');
    })
    .catch((error) => {
      console.error("Failed to add category:", error);
      res.redirect('/categories');
    });
});

// Handle deleting a category
app.get('/categories/delete/:id', (req, res) => {
  const categoryId = req.params.id;

  store_service.deleteCategoryById(categoryId)
    .then(() => {
      res.redirect('/categories');
    })
    .catch((error) => {
      res.status(500).send("Unable to delete category / Category could not be located.");
    });
});

// Handle deleting an item
app.get("/items/delete/:id", (req, res) => {
  const itemId = req.params.id;

  store_service
    .deletePostById(itemId)
    .then(() => {
      res.redirect("/items");
    })
    .catch((error) => {
      res.status(500).send("Unable to Remove Item / Item not found");
    });
});

// Render shop page with specific item details
app.get('/shop/:id', async (req, res) => {
  let viewData = {};

  try {
    let items = [];

    if (req.query.category) {
      items = await store_service.getPublishedItemsByCategory(req.query.category);
    } else {
      items = await store_service.getPublishedItems();
    }

    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    viewData.items = items;

    if (viewData.items.length === 0) {
      viewData.message = "No outcome detected.";
    }
  } catch (err) {
    viewData.message = "No outcome detected.";
  }

  try {
    viewData.item = await store_service.getItemById(req.params.id);
  } catch (err) {
    viewData.message = "No outcome detected."; 
  }

  try {
    let categories = await store_service.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "No outcome detected.";
  }

  res.render("shop", { data: viewData });
});

// Handle 404 Not Found
app.use((req, res, next) => {
  res.status(404).render("404");
});
