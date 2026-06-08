const express = require("express");

const router = express.Router();

const Booking =
require("../models/Booking");


// CREATE BOOKING

router.post("/create", async (req, res) => {

  try {

    const booking =
    new Booking(req.body);

    await booking.save();

    res.json({
      success: true,
      booking,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }

});


// GET ALL BOOKINGS

router.get("/", async (req, res) => {

  const bookings =
  await Booking.find();

  res.json(bookings);

});
// UPDATE BOOKING STATUS

router.put("/status/:id", async (req, res) => {

  try {

    const booking =
    await Booking.findByIdAndUpdate(

      req.params.id,

      {
        status: req.body.status,
      },

      { new: true }

    );

    res.json({
      success: true,
      booking,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }

});
// GET BOOKINGS BY USER

router.get("/user/:name", async (req, res) => {

  try {

    const bookings =
    await Booking.find({

      userName: req.params.name,

    });

    res.json(bookings);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }

});
// GET BOOKINGS BY ARTIST

router.get("/artist/:id", async (req, res) => {

  try {

    const bookings =
    await Booking.find({

      artistId: req.params.id,

    });

    res.json(bookings);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }

});
module.exports = router;