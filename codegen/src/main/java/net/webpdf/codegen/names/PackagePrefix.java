package net.webpdf.codegen.names;

import java.util.List;

public class PackagePrefix {

    private final String prefix;
    private final String location;
    private final List<String> preservePrefixTypes;

    PackagePrefix(String prefix, String location, List<String> preservePrefixTypes) {
        this.prefix = prefix;
        this.location = location;
        this.preservePrefixTypes = preservePrefixTypes;
    }

    public String getAPIPrefix() {
        return prefix;
    }

    public String getFileLocation() {
        return location;
    }

    public String getPackageLocation() {
        return location.replaceAll("/", ".");
    }

    public boolean shallPreservePrefix(String modelName) {
        return preservePrefixTypes.contains(modelName);
    }

}
