  /*
  var divA       = globalState;
  var divB       = tx;
  var arrowLeft  = document.querySelector("#arrowLeft");
  var arrowRight = document.querySelector("#arrowRight");

  function getPageRelativePos(elem) {
    const rect = elem.getBoundingClientRect();
    return {
      left: rect.left + window.scrollX | 0,
      top: rect.top + window.scrollY | 0,
      width: rect.width,
      height: rect.height,
    };
  }
  var drawConnector = function() {
    const divAPos = getPageRelativePos(divA);
    const divBPos = getPageRelativePos(divB);
    var posnALeft = {
      x: divAPos.left - 8,
      y: divAPos.top  + divAPos.height / 2,
    };
    var posnARight = {
      x: divAPos.left + divAPos.width + 8,
      y: divAPos.top  + divAPos.height / 2
    };
    var posnBLeft = {
      x: divBPos.left - 8,
      y: divBPos.top  + divBPos.height / 2
    };
    var posnBRight = {
      x: divBPos.left + divBPos.width + 8,
      y: divBPos.top  + divBPos.height / 2
    };
    var dStrLeft =
        "M" +
        (posnALeft.x      ) + "," + (posnALeft.y) + " " +
        "C" +
        (posnALeft.x - 100) + "," + (posnALeft.y) + " " +
        (posnBLeft.x - 100) + "," + (posnBLeft.y) + " " +
        (posnBLeft.x      ) + "," + (posnBLeft.y);
    arrowLeft.setAttribute("d", dStrLeft);
    var dStrRight =
        "M" +
        (posnBRight.x      ) + "," + (posnBRight.y) + " " +
        "C" +
        (posnBRight.x + 100) + "," + (posnBRight.y) + " " +
        (posnARight.x + 100) + "," + (posnARight.y) + " " +
        (posnARight.x      ) + "," + (posnARight.y);
    arrowRight.setAttribute("d", dStrRight);
  };

  //drawConnector();
  */