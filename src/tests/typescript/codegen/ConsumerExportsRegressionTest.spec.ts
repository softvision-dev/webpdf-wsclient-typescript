import {expect} from "chai";
import {it, suite} from "mocha";
import {models} from "../../../main/typescript";

suite("ConsumerExportsRegressionTest", function (): void {
	it("keeps CertificateEntry static defaults API", function (): void {
		expect(models.CertificateEntry.getIsPrivateKeyReadableDefault).to.be.a("function");
	});

	it("exports Toolbox inline compatibility models as classes", function (): void {
		class DerivedImage extends models.ToolboxImageImage {}
		class DerivedAnnotation extends models.ToolboxAnnotationAnnotation {}

		const image: models.ToolboxImageImage = new DerivedImage();
		const annotation: models.ToolboxAnnotationAnnotation = new DerivedAnnotation();

		expect(image).to.be.instanceOf(models.ToolboxImageImage);
		expect(annotation).to.be.instanceOf(models.ToolboxAnnotationAnnotation);
	});

	it("exports shared QueueMode enum", function (): void {
		expect(models.QueueMode).to.not.equal(undefined);
		expect(models.QueueMode).to.have.property("AUTO");
		expect(models.QueueMode).to.have.property("MANUAL");
	});

	it("BaseToolbox.fromJson strips extra properties from nested objects in toJson()", function (): void {
		const bt: models.BaseToolbox = models.BaseToolbox.fromJson({
			"merge": {
				"addMode": "atTheEnd",
				"data": {
					"format": "id",
					"outlineName": "",
					"source": "value",
					"uri": "",
					"value": "MzYzNDQ3YzQ3ZTU0NDQ4N2IwZDc0MjNiZjVkYzc0ZDU="
				},
				"mode": "atTheEnd",
				"outlineName": "",
				"page": 1,
				"removeStaticXFA": false,
				"resetMetadata": false,
				"sourceIsZip": false
			}
		});
		const json: Record<string, any> = bt.toJson() as Record<string, any>;
		expect(json).to.have.property("merge");
		expect(json["merge"]).to.not.have.property("addMode");
		expect(json["merge"]).to.have.property("mode");
		expect(json["merge"]).to.have.property("data");
	});

});
