const express = require('express')
const cors = require('cors')
const axios = require('axios')
const cherrio = require('cheerio')

const app = express()

const diningUrl = 'https://appl.housing.ucsb.edu/menu/day/'

const dlg = '#DeLaGuerra-body > div.panel'
const ortega = '#Ortega-body > div.panel'
const carrillo = '#Carrillo-body > div.panel'
const portola = '#Portola-body > div.panel'

var foodType = food => {
  const veganRegEx = /\(vgn\)/gm
  const vegetarianRegEx = /\(v\)/gm
  const nutsRegEx = /\(w\/nuts\)/gm

  const foodObj = {
    name: food
  }

  if (food.match(vegetarianRegEx)) {
    foodObj.name = foodObj.name.replace(vegetarianRegEx, '').trim()
    foodObj.type = 'vegetarian'
  }

  if (food.match(veganRegEx)) {
    foodObj.name = foodObj.name.replace(veganRegEx, '').trim()
    foodObj.type = 'vegan'
  }

  if (food.match(nutsRegEx)) {
    foodObj.name = foodObj.name.replace(nutsRegEx, '').trim()
    foodObj.allergy = 'nuts'
  }

  return foodObj
}

const onOdd = i => i % 2 === 1
const onEven = i => i % 2 === 0

const doit = async () => {
  const qq = await axios.get(diningUrl)

  const $ = cherrio.load(qq.data)

  const mealNames = selector =>
    $(selector)
      .find('h5')
      .map((index, el) =>
        $(el)
          .text()
          .trim()
      )
      .toArray()

  const meals = selector =>
    $(selector)
      .children()
      .filter(onOdd)
      .map((i, meal) =>
        $(meal)
          .children()
          .map((j, station) =>
            $(station)
              .children()
              .map((k, c) => $(c).text())
          )
      )
      .toArray()
      .map(meal =>
        $(meal)
          .toArray()
          .map(station => $(station).toArray())
      )
      .map(meal =>
        meal.map(station =>
          station.reduce((result, input, index) => {
            if (index === 0) {
              result.push(input)
            } else {
              result.push(foodType(input))
            }
            return result
          }, [])
        )
      )

  // console.log('dlg', mealNames(dlg))
  // console.log('ortega', mealNames(ortega))
  // console.log('carrillo', mealNames(carrillo))
  // console.log('portola', mealNames(portola))
  //
  // console.log('dlg', meals(dlg))
  // console.log('ortega', meals(ortega))
  // console.log('carrillo', meals(carrillo))
  // console.log('portola', meals(portola))

  const stitcher = selector =>
    mealNames(selector).map((meal, index) => {
      return {
        meal,
        stations: meals(selector)[index]
      }
    })

  const locations = [
    { name: 'dlg', selector: dlg },
    { name: 'ortega', selector: ortega },
    { name: 'portola', selector: portola },
    { name: 'carrillo', selector: carrillo }
  ].map(location => {
    return {
      location: location.name,
      meals: stitcher(location.selector)
    }
  })

  return locations

  /*
[
  {
    location: dlg,
    meals: [{
      meal: breakfast,
      stations: [

      ]
    }]
  }, {
    location: carrillo,
  }

]
*/
}

app.use(cors())

app.get('/ucsb-dining-menu', async (req, res) => {
  const locations = await doit()
  res.json(locations)
})

app.listen(3000, function() {
  console.log('listening on port 3000!')
})
