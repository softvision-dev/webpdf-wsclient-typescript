package net.webpdf.codegen.extension;

public enum WebPDFExtensionKey {

    EXTENDS("extends"),
    EXTENDS_PACKAGE("extendsPackage"),
    EXTENDED_BY("extendedBy"),
    TYPE_INFO_INITIALIZED("typeInfoInitialized"),
    TYPE_PACKAGE_NAME("typePackageName"),
    TYPE_CLASS_NAME("typeClassName"),
    TYPE_LOCATION("typeLocation"),
    PARENT_PACKAGE_NAME("parentPackageName"),
    PARENT_CLASS_NAME("parentClassName"),
    ENUM_NAME("enumName"),
    ENUM_DEFINITION("enumDefinition"),
    IS_ENUM_REFERENCE("isEnumReference"),
    IS_EXTRACTED_ENUM("isExtractedEnum"),
    IS_ENUM_TYPE("isEnumType"),
    IS_TYPE_REFERENCE("isTypeReference"),
    DEFAULT_VALUE("defaultValue"),
    IMPORTS("imports"),
    RELATIVE_INDEX_LOCATION("relativeIndexLocation"),

    ORDERED_INDEX("orderedIndex"),
    DESCRIPTION("description");

    private final String value;

    WebPDFExtensionKey(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

}
