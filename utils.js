/* group tpos to kpos line, add up all score in same line*/
const groupByLine=function(res,kposs,nosort){ 
	var byline={},out=[];
	var matches=res.map(function(r,idx){
			return [kposs[idx],r[1]];
	});
	matches.forEach(function(m){
		const kpos=m[0];
		if (!byline[kpos]) byline[kpos]=0;
		if (m[1]>byline[kpos]) byline[kpos] = m[1];
	});
	for (var kpos in byline) {
		out.push([parseInt(kpos,10),byline[kpos]]);
	}
	if (!nosort) out.sort(function(a,b){return b[1]-a[1]});
	return out;
}

/* convert to kPos for final posting with optional score*/
const postingToKPos=function(cor,arr,cb){
	var candidates=arr, tposs=arr,  nosort=false;
	if (typeof tposs[0]!=="number") { //candidate format
		tposs=arr.map(function(r){return r[0]});
	} else {
		candidates=arr.map(function(a){return [a,1]});//same score for all posting
		nosort=true;
	}
	cor.fromTPos(tposs,function(kposs){
		const matches=groupByLine(candidates,kposs,nosort);
		cb(matches);
	});	
}
module.exports={postingToKPos:postingToKPos};