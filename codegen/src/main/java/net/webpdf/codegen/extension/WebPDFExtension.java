package net.webpdf.codegen.extension;

import io.swagger.codegen.v3.CodegenModel;
import io.swagger.codegen.v3.CodegenObject;
import io.swagger.codegen.v3.CodegenProperty;
import net.webpdf.codegen.extension.enumeration.EnumerationDefinition;
import net.webpdf.codegen.names.TypeName;

import java.util.*;

import static net.webpdf.codegen.extension.WebPDFExtensionKey.*;
import static net.webpdf.codegen.extension.WebPDFExtensionKey.PARENT_CLASS_NAME;

@SuppressWarnings({"UnusedReturnValue", "SameParameterValue", "unused", "BooleanMethodIsAlwaysInverted"})
public class WebPDFExtension {

    private static final String EXTENSION_NAME = "x-webpdf-codegen";
    private final Map<String, Object> values;

    private WebPDFExtension(Map<String, Object> values) {
        this.values = values;
    }

    public boolean isTypeInfoInitialized() {
        return getBool(TYPE_INFO_INITIALIZED);
    }

    public WebPDFExtension setIsTypeInfoInitialized(boolean value) {
        set(TYPE_INFO_INITIALIZED, value);
        return this;
    }

    public boolean isEnumReference() {
        return getBool(IS_ENUM_REFERENCE);
    }

    public WebPDFExtension setIsEnumReference(boolean value) {
        set(IS_ENUM_REFERENCE, value);
        return this;
    }

    public boolean isExtractedEnum() {
        return getBool(IS_EXTRACTED_ENUM);
    }

    public WebPDFExtension setIsExtractedEnum(boolean value) {
        set(IS_EXTRACTED_ENUM, value);
        return this;
    }

    public boolean isEnumType() {
        return getBool(IS_ENUM_TYPE);
    }

    public WebPDFExtension setIsEnumType(boolean value) {
        set(IS_ENUM_TYPE, value);
        return this;
    }

    public boolean isTypeReference() {
        return getBool(IS_TYPE_REFERENCE);
    }

    public String getDefaultValue() {
        return getString(DEFAULT_VALUE);
    }

    public WebPDFExtension setDefaultValue(String value) {
        set(DEFAULT_VALUE, value);
        return this;
    }

    public WebPDFExtension setIsTypeReference(boolean value) {
        set(IS_TYPE_REFERENCE, value);
        return this;
    }

    public String getExtendsPackage() {
        return getString(EXTENDS_PACKAGE);
    }

    public WebPDFExtension setExtendsPackage(String value) {
        set(EXTENDS_PACKAGE, value);
        return this;
    }

    public String getExtends() {
        return getString(EXTENDS);
    }

    public WebPDFExtension setExtends(String value) {
        set(EXTENDS, value);
        return this;
    }

    public Map<String, String> getExtendedBy() {
        return getMap(String.class, String.class, EXTENDED_BY);
    }

    public WebPDFExtension setExtendedBy(Map<String, String> value) {
        set(EXTENDED_BY, value);
        return this;
    }

    public List<String> getImports() {
        return getList(String.class, IMPORTS);
    }

    public WebPDFExtension setImports(List<String> value) {
        set(IMPORTS, value);
        return this;
    }

    public String getTypePackageName() {
        return getString(TYPE_PACKAGE_NAME);
    }

    public WebPDFExtension setTypePackageName(String value) {
        set(TYPE_PACKAGE_NAME, value);
        return this;
    }

    public String getTypeClassName() {
        return getString(TYPE_CLASS_NAME);
    }

    public WebPDFExtension setTypeClassName(String value) {
        set(TYPE_CLASS_NAME, value);
        return this;
    }

    public String getTypeRootLocation() {
        return getString(TYPE_LOCATION);
    }

    public WebPDFExtension setTypeRootLocation(String value) {
        set(TYPE_LOCATION, value);
        return this;
    }

    public String getRelativeIndexLocation() {
        return getString(RELATIVE_INDEX_LOCATION);
    }

    public WebPDFExtension setRelativeIndexLocation(String value) {
        set(RELATIVE_INDEX_LOCATION, value);
        return this;
    }

    public String getParentPackageName() {
        return getString(PARENT_PACKAGE_NAME);
    }

    public WebPDFExtension setParentPackageName(String value) {
        set(PARENT_PACKAGE_NAME, value);
        return this;
    }

    public String getParentClassName() {
        return getString(PARENT_CLASS_NAME);
    }

    public WebPDFExtension setParentClassName(String value) {
        set(PARENT_CLASS_NAME, value);
        return this;
    }

    public String getEnumName() {
        return getString(ENUM_NAME);
    }

    public WebPDFExtension setEnumName(String value) {
        set(ENUM_NAME, value);
        return this;
    }

    public EnumerationDefinition getEnumDefinition() {
        return get(ENUM_DEFINITION, EnumerationDefinition.class);
    }

    public WebPDFExtension setEnumDefinition(EnumerationDefinition value) {
        set(ENUM_DEFINITION, value);
        return this;
    }

    public String getDescription() {
        return getString(DESCRIPTION);
    }

    public WebPDFExtension setDescription(String value) {
        set(DESCRIPTION, value);
        return this;
    }

    public boolean contains(WebPDFExtensionKey key) {
        return this.values.containsKey(key.getValue());
    }

    private void set(WebPDFExtensionKey key, Object value) {
        this.values.put(key.getValue(), value);
    }

    private <T> T get(WebPDFExtensionKey key, Class<T> expectedType) {
        Object value = values.get(key.getValue());
        if (expectedType.isInstance(value)) {
            return expectedType.cast(value);
        }
        return null;
    }

    private boolean getBool(WebPDFExtensionKey key) {
        Boolean value = get(key, Boolean.class);
        return value != null ? value : false;
    }

    private String getString(WebPDFExtensionKey key) {
        return get(key, String.class);
    }

    private <K, T> Map<K, T> getMap(Class<K> keyType, Class<T> valueType, WebPDFExtensionKey key) {
        Map<?, ?> value = get(key, Map.class);
        if (value != null) {
            Map<K, T> map = new HashMap<>();
            for (Map.Entry<?, ?> entry : value.entrySet()) {
                Object entryKey = entry.getKey();
                Object entryValue = entry.getValue();
                if (keyType.isInstance(entryKey) && valueType.isInstance(entryValue)) {
                    map.put(keyType.cast(entryKey), valueType.cast(entryValue));
                }
            }
            set(key, map);
            return map;
        }
        return null;
    }

    private <T> List<T> getList(Class<T> listType, WebPDFExtensionKey key) {
        List<?> value = get(key, List.class);
        if (value != null) {
            List<T> list = new ArrayList<>();
            for (Object entry : value) {
                if (listType.isInstance(entry)) {
                    list.add(listType.cast(entry));
                }
            }
            set(key, list);
            return list;
        }
        return null;
    }

    private static WebPDFExtension determineExtension(CodegenObject object) {
        Object curExt = object.getVendorExtensions().get(EXTENSION_NAME);
        Map<String, Object> map = new HashMap<>();
        if (curExt instanceof Map) {
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) curExt).entrySet()) {
                Object entryKey = entry.getKey();
                if (entryKey instanceof String) {
                    map.put((String) entryKey, entry.getValue());
                }
            }
            object.getVendorExtensions().put(EXTENSION_NAME, map);
            return new WebPDFExtension(map);
        }
        object.getVendorExtensions().put(EXTENSION_NAME, map);
        return new WebPDFExtension(map);
    }

    public static WebPDFExtension determineExtension(CodegenProperty property, String modelPackage) {
        WebPDFExtension extension = determineExtension(property);
        CodegenProperty actual = property;
        if (property.getIsMapContainer()) {
            actual = property.getItems();
        }
        if (!extension.isTypeInfoInitialized() && !actual.getIsEnum() && actual.getComplexType() != null) {
            TypeName type = new TypeName(actual.getComplexType());
            extension.setTypePackageName(type.getPackagePath(modelPackage));
            extension.setTypeClassName(type.getName());
            TypeName name = new TypeName("", "index");
            extension.setRelativeIndexLocation(
                    name.getRelativeFileLocation(type.getPack()));
            extension.setIsTypeReference(true);
        }
        extension.setIsTypeInfoInitialized(true);
        return extension;
    }

    public static WebPDFExtension determineExtension(CodegenModel model, String modelPackage) {
        WebPDFExtension extension = determineExtension(model);
        if (!extension.isTypeInfoInitialized()) {
            TypeName type = new TypeName(model.getClassname());
            extension.setIsTypeInfoInitialized(true);
            extension.setTypePackageName(type.getPackagePath(modelPackage));
            extension.setTypeClassName(type.getName());
            TypeName name = new TypeName("", "index");
            extension.setRelativeIndexLocation(
                    name.getRelativeFileLocation(type.getPack()));
            if (model.getParent() != null) {
                TypeName parentType = new TypeName(model.getParent());
                extension.setParentPackageName(parentType.getPackagePath(modelPackage));
                extension.setParentClassName(parentType.getName());
            }
        }
        return extension;
    }

}
