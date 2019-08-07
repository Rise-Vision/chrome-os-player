const scheduleParser = require('./scheduling/schedule-parser');

module.exports = {
  restructureHTMLTemplatesToURLItems(contentData) {
    if (!contentData || !contentData.content || !contentData.content.schedule ||
    !contentData.content.schedule.items) {return contentData;}

    const restructuredData = JSON.parse(JSON.stringify(contentData));

    const protocol = scheduleParser.hasOnlyNoViewerURLItems(contentData) ? "https" : "http";

    const HTMLTemplateURL = `${protocol}://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID`;

    restructuredData.content.schedule.items
    .filter(item=>item.presentationType === "HTML Template")
    .forEach(item=>{
      item.type = "url";
      item.presentationId = item.objectReference;
      item.productCode = getPCode(item.objectReference, contentData);
      item.version = "beta";
      item.objectReference = HTMLTemplateURL
        .replace("STAGE", item.version)
        .replace("PCODE", item.productCode)
        .replace("PID", item.presentationId);
    });

    return restructuredData;
  }
}

function getPCode(objectReference, contentData) {
  const referencedPresentation = contentData.content.presentations
  .filter(pres=>pres.id === objectReference);

  return referencedPresentation[0] && referencedPresentation[0].productCode;
}
