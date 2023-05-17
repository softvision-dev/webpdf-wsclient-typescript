package net.webpdf.codegen.extension.enumeration;

import java.util.HashMap;
import java.util.Map;

@SuppressWarnings("unused")
public class EnumerationDefinition {

    private final String packageName;
    private final Map<String, String> enumValues = new HashMap<>();

    public EnumerationDefinition(String packageName) {
        this.packageName = packageName;
    }

    public EnumerationDefinition put(String key, String value) {
        enumValues.put(key, value);
        return this;
    }

    public String getPackageName() {
        return packageName;
    }

    public Map<String, String> getEnumValues() {
        return enumValues;
    }

}
