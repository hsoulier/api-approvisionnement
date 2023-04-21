// Add Express
const { default: axios } = require("axios")
const express = require("express")

// Initialize Express
const app = express()

// Add body-parser
const bodyParser = require("body-parser")
app.use(bodyParser.json())

const supplySummary = {
  nbSupply: 0,
  totalNbProducts: 0,
  totalPurchasePrice: 0,
}
// Create GET request
app.get("/api/ping", (req, res) => {
  res.send("PONG")
})

app.post("/api/supply", async (req, res) => {
  try {
    const { supplyId, products } = req.body
    if (!supplyId || !products) {
      throw new Error("Missing supplyId or products")
    }
    if (!Array.isArray(products)) {
      throw new Error("Products must be an array")
    }
    for (const product of products) {
      if (
        !product.ean ||
        !product.name ||
        !product.description ||
        !product.purchasePricePerUnit ||
        !product.quantity
      ) {
        throw new Error("Missing product data")
      }
      const res = await axios.get(
        "http://microservices.tp.rjqu8633.odns.fr/api/products"
      )

      if (!res.data.find((p) => p.ean === product.ean)) {
        await axios.post(
          "http://microservices.tp.rjqu8633.odns.fr/api/products",
          {
            ean: product.ean,
            name: product.name,
            description: product.description,
            categories: [],
            price: product.purchasePricePerUnit,
          }
        )
      }
      supplySummary.totalNbProducts += product.quantity
      supplySummary.totalPurchasePrice +=
        product.purchasePricePerUnit * product.quantity

      await axios.post(`/api/stock/${product.ean}/movement`, {
        productId: product.ean,
        quantity: product.quantity,
        status: "Supply",
      })
    }
    supplySummary.nbSupply += 1
    res.status(204).end()
  } catch (error) {
    res.status(400).send(error.message)
  }
})
app.get("/api/supply/summary", async (req, res) => {
  try {
    res.status(200).json(supplySummary)
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal server error")
  }
})
app.post("/api/supply-needed", async (req, res) => {
  try {
    const { productId } = req.body
    if (!productId) {
      throw new Error("Missing productId")
    }
    await axios.post(
      "http://microservices.tp.rjqu8633.odns.fr/api/supply-request",
      { ean: productId }
    )

    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal server error")
  }
})

// Initialize server
app.listen(5001, () => {
  console.log("Running on port 5001.")
})

module.exports = app
