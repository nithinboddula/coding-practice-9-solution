const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//Create user API 1

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const retrieveUserQuery = `
  SELECT 
    *
  FROM 
    user
  WHERE
    username = "${username}";`;

  const registerUserQuery = `
  INSERT INTO
    user(username, name, password, gender, location)
  VALUES('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');`;

  const dbUser = await db.get(retrieveUserQuery);

  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(registerUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    //username exists
    response.status(400);
    response.send("User already exists");
  }
});

//login API 2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const retrieveUserQuery = `
  SELECT 
    *
  FROM 
    user
  WHERE
    username = "${username}";`;

  const dbUser = await db.get(retrieveUserQuery);

  if (dbUser === undefined) {
    //unregistered user
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//update password API 3
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const retrieveUserQuery = `
  SELECT 
    *
  FROM 
    user
  WHERE
    username = "${username}";`;

  const updatePasswordQuery = `
  UPDATE 
    user
  SET 
    password = "${hashedPassword}"
  WHERE
    username = "${username}";`;

  const dbUser = await db.get(retrieveUserQuery);

  if (dbUser === undefined) {
    //unregistered user
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        await db.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
