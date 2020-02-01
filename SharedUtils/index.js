let fractionjs = require('fraction.js');

const fractionMatchers = { // Regex & replacement value by charcode
  189: [/\u00BD/g, '1/2'], // ½  \u00BD;
  8531: [/\u2153/g, '1/3'], // ⅓  \u2153;
  8532: [/\u2154/g, '2/3'], // ⅔  \u2154;
  188: [/\u00BC/g, '1/4'], // ¼  \u00BC;
  190: [/\u00BE/g, '3/4'], // ¾  \u00BE;
  8533: [/\u2155/g, '1/5'], // ⅕  \u2155;
  8534: [/\u2156/g, '2/5'], // ⅖  \u2156;
  8535: [/\u2157/g, '3/5'], // ⅗  \u2157;
  8536: [/\u2158/g, '4/5'], // ⅘  \u2158;
  8537: [/\u2159/g, '1/6'], // ⅙  \u2159;
  8538: [/\u215A/g, '5/6'], // ⅚  \u215A;
  8528: [/\u2150/g, '1/7'], // ⅐  \u2150;
  8539: [/\u215B/g, '1/8'], // ⅛  \u215B;
  8540: [/\u215C/g, '3/8'], // ⅜  \u215C;
  8541: [/\u215D/g, '5/8'], // ⅝  \u215D;
  8542: [/\u215E/g, '7/8'], // ⅞  \u215E;
  8529: [/\u2151/g, '1/9'], // ⅑  \u2151;
  8530: [/\u2152/g, '1/10'], // ⅒ \u2152;
};

const fractionMatchRegexp = new RegExp(Object.keys(fractionMatchers).map(e => fractionMatchers[e]).map(matcher => matcher[0].source).join('|'), 'g');

const replaceFractionsInText = rawText => {
  return rawText.replace(fractionMatchRegexp, match => {
    const matcher = fractionMatchers[match.charCodeAt(0)];
    return matcher ? matcher[1] : match; // Fallback on original value if not found
  });
}

function parseIngredients(ingredients, scale, boldify) {
  if (!ingredients) return [];

  ingredients = replaceFractionsInText(ingredients);

  let lines = ingredients.match(/[^\r\n]+/g).map(match => ({
    content: match,
    originalContent: match,
    complete: false,
    isHeader: false
  }));

  var measurementRegexp = /((\d+ )?\d+([\/\.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([\/\.]\d+)?)|((\d+ )?\d+[\/\.]\d+)|\d+/;

  // TODO: Replace measurementRegexp with this:
  // var measurementRegexp = /(( ?\d+([\/\.]\d+)?){1,2})(((-)|( to )|( - ))(( ?\d+([\/\.]\d+)?){1,2}))?/; // Simpler version of above, but has a bug where it removes some spacing

  // Starts with [, anything inbetween, ends with ]
  var headerRegexp = /^\[.*\]$/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].content.trim(); // Trim only spaces (no newlines)

    var headerMatches = line.match(headerRegexp);

    const ingredientPartDelimiters = line.match(/ \+|plus /g); // Multipart measurements (1 cup + 1 tablespoon)
    const ingredientParts = line.split(/ \+|plus /); // Multipart measurements (1 cup + 1 tablespoon)
    var measurementMatches = ingredientParts.map(linePart => linePart.match(measurementRegexp));

    if (headerMatches && headerMatches.length > 0) {
      var header = headerMatches[0];
      var headerContent = header.substring(1, header.length - 1); // Chop off brackets

      if (boldify) headerContent = `<b class="sectionHeader">${headerContent}</b>`;
      lines[i].content = headerContent;
      lines[i].isHeader = true;
    } else if (measurementMatches.find(el => el && el.length > 0)) {
      const updatedIngredientParts = measurementMatches.map((el, idx) => {
        if (!el) return ingredientParts[idx];

        try {
          var measurement = el[0];

          const measurementPartDelimiters = measurement.match(/(-)|( to )|( - )/g);
          const measurementParts = measurement.split(/-|to/);
  
          for (var j = 0; j < measurementParts.length; j++) {
            // console.log(measurementParts[j].trim())
            var scaledMeasurement = fractionjs(measurementParts[j].trim()).mul(scale);
  
            // Preserve original fraction format if entered
            if (measurementParts[j].indexOf('/') > -1) {
              scaledMeasurement = scaledMeasurement.toFraction(true);
            }
  
            if (boldify) measurementParts[j] = '<b class="ingredientMeasurement">' + scaledMeasurement + '</b>';
            else measurementParts[j] = scaledMeasurement;
          }

          let updatedMeasurement;
          if (measurementPartDelimiters) {
            updatedMeasurement = measurementParts.reduce((acc, measurementPart, idx) => acc + measurementPart + (measurementPartDelimiters[idx] || ""), "");
          } else {
            updatedMeasurement = measurementParts.join(' to ');
          }

          return ingredientParts[idx].replace(measurementRegexp, updatedMeasurement);
        } catch (e) {
          console.error("failed to parse", e)
          return ingredientParts[idx];
        }
      });

      if (ingredientPartDelimiters) {
        lines[i].content = updatedIngredientParts.reduce((acc, ingredientPart, idx) => acc + ingredientPart + (ingredientPartDelimiters[idx] || ""), "");
      } else {
        lines[i].content = updatedIngredientParts.join(" + ");
      }

      lines[i].isHeader = false;

    }
  }

  return lines;
}

function parseInstructions(instructions) {
  instructions = replaceFractionsInText(instructions);

  // Starts with [, anything inbetween, ends with ]
  var headerRegexp = /^\[.*\]$/;

  let stepCount = 1;
  return instructions.split(/\r?\n/).map(instruction => {
    let line = instruction.trim();
    var headerMatches = line.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      var header = headerMatches[0];
      var headerContent = header.substring(1, header.length - 1); // Chop off brackets

      stepCount = 1;

      return {
        content: headerContent,
        isHeader: true,
        count: 0,
        complete: false
      }
    } else {
      return {
        content: line,
        isHeader: false,
        count: stepCount++,
        complete: false
      }
    }
  });
}

module.exports = {
  parseIngredients,
  parseInstructions
}
