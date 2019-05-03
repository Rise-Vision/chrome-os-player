const systemInfo = require('./logging/system-info');

module.exports = {
  restructureHTMLTemplatesToURLItems(contentData) {
    if (!contentData || !contentData.content || !contentData.content.schedule ||
    !contentData.content.schedule.items) {return contentData;}

    const restructuredData = Object.assign({}, contentData);

    const HTMLTemplateURL = "http://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID";
    const isBeta = systemInfo.isBeta();

    restructuredData.content.schedule.items
    .filter(item=>item.presentationType === "HTML Template")
    .forEach(item=>{
      item.type = "url";
      item.objectReference = HTMLTemplateURL
        .replace("STAGE", isBeta ? "beta" : "stable")
        .replace("PCODE", getPCode(item.objectReference, contentData))
        .replace("PID", item.objectReference);
    });

    return restructuredData;
  }
}

function getPCode(objectReference, contentData) {
  const referencedPresentation = contentData.content.presentations
  .filter(pres=>pres.id === objectReference);

  return referencedPresentation[0] && referencedPresentation[0].productCode;
}
