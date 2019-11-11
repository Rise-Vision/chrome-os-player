const assert = require('assert');

const parser = require('../../src/html-template-url-parser');

describe("HTML Template Url Parser", () => {

  const content = {
    content: {
      schedule: {
        items: [
          {
            name: "test-not-html-presentation",
            type: "url",
            objectReference: "ABC123"
          },
          {
            name: "test-html-presentation",
            presentationType: "HTML Template",
            type: "presentation",
            objectReference: "DEF456"
          }
        ]
      },
      presentations: [
        {
          id: "ABC123"
        },
        {
          id: "DEF456",
          productCode: "test-pcode"
        }
      ]
    }
  };

  it("idempotently sets html template presentations to url items with template url", ()=>{
    const expectedChangedType = "url";
    const HTMLTemplatePresentationId = "DEF456";
    const HTMLTemplatePresentationProductCode = "test-pcode";
    const expectedChangedObjectReference = `http://widgets.risevision.com/stable/templates/${HTMLTemplatePresentationProductCode}/src/template.html?presentationId=${HTMLTemplatePresentationId}&waitForPlayer=true`;

    const newContent = parser.restructureHTMLTemplatesToURLItems(
                       parser.restructureHTMLTemplatesToURLItems(
                       parser.restructureHTMLTemplatesToURLItems(content)));

    assert.deepEqual(newContent, {
      content: {
        schedule: {
          items: [
            {
              name: "test-not-html-presentation",
              type: "url",
              objectReference: "ABC123"
            },
            {
              name: "test-html-presentation",
              presentationType: "HTML Template",
              type: expectedChangedType,
              objectReference: expectedChangedObjectReference,
              presentationId: "DEF456",
              productCode: "test-pcode",
              version: "stable"
            }
          ]
        },
        presentations: [
          {
            id: "ABC123"
          },
          {
            id: "DEF456",
            productCode: "test-pcode"
          }
        ]
      }
    });
  });

  it("loads html template from staging url if player is configured to stage", ()=>{

    const expectedChangedObjectReference = "http://widgets.risevision.com/staging/templates/test-pcode/src/template.html?presentationId=DEF456&waitForPlayer=true";

    const isStaging = true;

    const newContent = parser.restructureHTMLTemplatesToURLItems(content, isStaging);

    assert.deepEqual(newContent, {
      content: {
        schedule: {
          items: [
            {
              name: "test-not-html-presentation",
              type: "url",
              objectReference: "ABC123"
            },
            {
              name: "test-html-presentation",
              presentationType: "HTML Template",
              type: "url",
              objectReference: expectedChangedObjectReference,
              presentationId: "DEF456",
              productCode: "test-pcode",
              version: "staging"
            }
          ]
        },
        presentations: [
          {
            id: "ABC123"
          },
          {
            id: "DEF456",
            productCode: "test-pcode"
          }
        ]
      }
    });
  });
});
