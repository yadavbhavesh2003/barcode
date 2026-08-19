import bwipjs from "bwip-js";

bwipjs.toBuffer({
  bcid: 'code128',
  text: '58310472',
  scale: 3,
  height: 10,
  includetext: false,
})
.then(png => {
  console.log("BWIP JS PNG Buffer Length:", png.length);
})
.catch(err => {
  console.error("BWIP JS Error:", err);
});
