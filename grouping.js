const bsearch=require("ksana-corpus").bsearch;
const plist=require("./plist");
const groupStat=function(postings, groups){
	return plist.groupStat(postings,groups);
}
const filterMatch=function(cor,matches,excludegroup){
	if (!cor) return [];
	if (!excludegroup) return matches;

	var out=matches.slice();
	for (var i=0;i<excludegroup.length;i++) {
		if (!excludegroup[i]) continue;
		const startend=cor.groupTRange(i);
		const s=bsearch(out,startend[0],true);
		const e=bsearch(out,startend[1],true);
		out.splice(s,e-s);
	}
	return out;
}

module.exports={groupStat:groupStat,filterMatch:filterMatch}