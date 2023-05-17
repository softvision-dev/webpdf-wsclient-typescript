package net.webpdf.codegen.extension.index;

import io.swagger.codegen.v3.CodegenModel;
import net.webpdf.codegen.extension.WebPDFExtension;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@SuppressWarnings("unused")
public class IndexEntry implements Iterable<String> {

    private final List<String> exportedTypeNames = new ArrayList<>();
    private final String fileLocation;
    private final String packageLocation;
    private final CodegenModel model;

    public IndexEntry(String fileLocation, String packageLocation, CodegenModel model) {
        this.fileLocation = fileLocation;
        this.packageLocation = packageLocation;
        this.model = model;
    }

    public String getFileLocation() {
        return fileLocation;
    }

    public String getPackageLocation() {
        return packageLocation;
    }

    public CodegenModel getModel() {
        return model;
    }

    public String getExportedNames() {
        StringBuilder names = new StringBuilder();
        Iterator<String> itr = exportedTypeNames.iterator();
        while (itr.hasNext()) {
            names.append(itr.next());
            if (itr.hasNext()) {
                names.append(",");
            }
        }
        return names.toString();
    }

    public WebPDFExtension getWebPDFExtensions(String modelPackage) {
        return WebPDFExtension.determineExtension(model, modelPackage);
    }

    public List<String> getExportedTypeNames() {
        return exportedTypeNames;
    }

    public IndexEntry addExportedTypeName(String typeName) {
        this.exportedTypeNames.add(typeName);
        return this;
    }

    @Override
    public Iterator<String> iterator() {
        return exportedTypeNames.iterator();
    }

}
