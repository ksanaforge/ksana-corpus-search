const strstr=require("./strstr");
const page=require("fs").readFileSync("j13.txt","utf8");
const q="天子掌鳥獸也";
debugger;
const matches=strstr.indexOf(page,q);

matches.map(function(m){
	console.log(page.substring(m[0],m[1],m));
})