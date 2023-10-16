package net.webpdf.codegen;

import io.swagger.codegen.v3.CodegenConstants;
import io.swagger.codegen.v3.CodegenModel;
import io.swagger.codegen.v3.CodegenProperty;
import io.swagger.codegen.v3.generators.DefaultCodegenConfig;
import io.swagger.codegen.v3.generators.SchemaHandler;
import io.swagger.v3.oas.models.media.ComposedSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import net.webpdf.codegen.extension.WebPDFExtension;
import net.webpdf.codegen.extension.enumeration.EnumerationDefinition;
import net.webpdf.codegen.names.ModelName;
import net.webpdf.codegen.names.TypeName;

import java.util.*;

import static net.webpdf.codegen.extension.WebPDFExtensionKey.*;

public class TypeScriptSchemaHandler extends SchemaHandler {
    private final TypeScriptFetchEnhancedClientCodegen codegenConfig;
    private final Map<String, CodegenModel> enumerationModels = new HashMap<>();

    public TypeScriptSchemaHandler(DefaultCodegenConfig codegenConfig) {
        super(codegenConfig);
        this.codegenConfig = (TypeScriptFetchEnhancedClientCodegen) codegenConfig;
    }

    /**
     * modifies the discriminator mapping and removes the reference path
     *
     * @param codegenModel {CodegenModel}
     */
    private void modifyDiscriminator(CodegenModel codegenModel) {
        if (codegenModel.getDiscriminator() == null || codegenModel.getDiscriminator().getMapping() == null) {
            return;
        }

        Map<String, String> mapping = codegenModel.getDiscriminator().getMapping();

        for (Map.Entry<String, String> entry : mapping.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            TypeName typeName = new TypeName(new ModelName(
                    value.substring(value.lastIndexOf("/") + 1)
            ).getClassName());
            mapping.put(key, typeName.getName());
        }
    }

    /**
     * modifies the vendorExtensions and removes separator characters from extension names
     *
     * @param codegenModel {CodegenModel}
     */
    private void modifyVendorExtensions(CodegenModel codegenModel, Schema<?> schema, Map<String, CodegenModel> allModels) {
        WebPDFExtension extensions = WebPDFExtension.determineExtension(codegenModel, codegenConfig.modelPackage());
        if (extensions.contains(EXTENDS)) {
            TypeName extendsName = new TypeName(codegenConfig.toModelName(extensions.getExtends()));
            extensions.setExtends(extendsName.getName());
            extensions.setExtendsPackage(extendsName.getPack());
        }

        ComposedSchema composedSchema;
        if (schema.getDiscriminator() == null && schema instanceof ComposedSchema &&
                (composedSchema = (ComposedSchema) schema).getOneOf() != null) {
            Map<String, String> extendedBy = new LinkedHashMap<>();

            for (Schema<?> refSchema : composedSchema.getOneOf()) {
                String referenceValue = refSchema.get$ref();

                ModelName modelName = new ModelName(referenceValue.substring(referenceValue.lastIndexOf("/") + 1));
                TypeName typeName = new TypeName(modelName.getPackageName());
                CodegenModel typeModel = allModels.get(typeName.getModelName());
                if (typeModel != null && typeModel.getVars() != null && !typeModel.getVars().isEmpty()) {
                    extendedBy.put(typeModel.getVars().get(0).getBaseName(), typeName.getName());
                }

            }
            extensions.setExtendedBy(extendedBy);
        }
    }

    private void modifyDefaults(CodegenModel model, Schema<?> schema) {
        Object defaultValue = schema.getDefault();
        WebPDFExtension extension = WebPDFExtension
                .determineExtension(model, codegenConfig.modelPackage());
        if (defaultValue != null) {
            if (defaultValue instanceof String) {
                extension.setDefaultValue(String.format("\"%s\"", defaultValue));
            } else {
                extension.setDefaultValue(defaultValue.toString());
            }
        }
        for (CodegenProperty var : model.getVars()) {
            WebPDFExtension propertyExtension = WebPDFExtension
                    .determineExtension(var, codegenConfig.modelPackage());
            String varName = var.getName();
            if (var.getBaseName() != null) {
                varName = var.getBaseName();
            }

            defaultValue = null;
            List<ObjectSchema> objectSchemas = new ArrayList<>();
            if (schema instanceof ComposedSchema && ((ComposedSchema)schema).getAllOf() != null) {
                for (Schema<?> allOfSchema : ((ComposedSchema)schema).getAllOf()) {
                    if (allOfSchema instanceof ObjectSchema) {
                        objectSchemas.add((ObjectSchema) allOfSchema);
                        break;
                    }
                }
            }
            if (!objectSchemas.isEmpty()) {
                for (ObjectSchema objectSchema : objectSchemas) {
                    Schema<?> propertySchema = objectSchema.getProperties().get(varName);
                    defaultValue = propertySchema.getDefault();
                    break;
                }
            }
            if (defaultValue == null && (schema.getProperties() != null && schema.getProperties().containsKey(varName))) {
                Schema<?> propertySchema = schema.getProperties().get(varName);
                defaultValue = propertySchema.getDefault();
            }

            if (defaultValue != null) {
                if (var.getIsByteArray()) {
                    propertyExtension.setDefaultValue("\"\"");
                    continue;
                }
                if (defaultValue instanceof String) {
                    propertyExtension.setDefaultValue(String.format("\"%s\"", defaultValue));
                    continue;
                }
                propertyExtension.setDefaultValue(defaultValue.toString());
            } else if (var.getBaseType().equalsIgnoreCase("array")) {
                propertyExtension.setDefaultValue("[]");
            } else if (var.getIsMapContainer()) {
                propertyExtension.setDefaultValue("{}");
            }
        }
    }

    private void extractInnerEnums(CodegenModel codegenModel, Map<String, CodegenModel> allModels) {
        for (CodegenProperty property : codegenModel.getVars()) {
            WebPDFExtension propertyExtensions =
                    WebPDFExtension.determineExtension(property, codegenConfig.modelPackage());
            if (propertyExtensions.getEnumName() != null) {
                TypeName typeName = new TypeName(
                        new ModelName(propertyExtensions.getEnumName()).getPackageName()
                );
                propertyExtensions.setIsExtractedEnum(true);
                String packageLocation = typeName.getPackageLocation(codegenConfig.modelPackage());
                if (allModels.containsKey(packageLocation)) {
                    throw new IllegalArgumentException("An extracted enum type collides with a plain type definition.");
                }
                if (!enumerationModels.containsKey(packageLocation)) {
                    EnumerationDefinition enumeration = new EnumerationDefinition(
                            typeName.getPackageLocation(packageLocation));
                    Object allowableValues = property.getAllowableValues().get("enumVars");
                    if (allowableValues instanceof List) {
                        List<?> enumValues = (List<?>) allowableValues;
                        for (Object value : enumValues) {
                            if (value instanceof Map) {
                                Map<?, ?> enumValue = (Map<?, ?>) value;
                                Object key = enumValue.get("name");
                                Object val = enumValue.get("value");
                                if (key instanceof String && val instanceof String) {
                                    enumeration.put((String) key, (String) val);
                                }
                            }
                        }
                    }
                    CodegenModel enumModel = new CodegenModel();
                    enumModel.getVendorExtensions().put(CodegenConstants.IS_ENUM_EXT_NAME, Boolean.TRUE);
                    enumModel.setClassname(packageLocation);
                    enumModel.setClassFilename(typeName.getRootFileLocation());
                    enumModel.setName(propertyExtensions.getEnumName());
                    WebPDFExtension extractedEnumExtensions =
                            WebPDFExtension.determineExtension(enumModel, codegenConfig.modelPackage());
                    extractedEnumExtensions.setEnumDefinition(enumeration);
                    enumerationModels.put(enumeration.getPackageName(), enumModel);
                    addComposedModel(enumModel);
                }
                propertyExtensions.setEnumName(typeName.getName());
                propertyExtensions.setTypeClassName(typeName.getName());
                propertyExtensions.setTypePackageName(packageLocation);
                propertyExtensions.setIsTypeReference(true);
                propertyExtensions.setDefaultValue(property.getDefaultValue());
                property.getVendorExtensions().put(CodegenConstants.IS_ENUM_EXT_NAME, Boolean.FALSE);
                property.getVendorExtensions().put(CodegenConstants.IS_PRIMITIVE_TYPE_EXT_NAME, Boolean.FALSE);
                property.setComplexType(packageLocation);

                if (property.getIsListContainer()) {
                    property.setDatatypeWithEnum("Array<" + typeName.getName() + ">");
                } else {
                    property.setDatatypeWithEnum(typeName.getName());
                }
            }
        }
    }

    public void processComposedSchemas(CodegenModel codegenModel, Schema
            schema, Map<String, CodegenModel> allModels) {
        modifyDiscriminator(codegenModel);
        modifyVendorExtensions(codegenModel, schema, allModels);
        modifyDefaults(codegenModel, schema);
        extractInnerEnums(codegenModel, allModels);

        if (!(schema instanceof ComposedSchema)) {
            return;
        }

        final ComposedSchema composedSchema = (ComposedSchema) schema;
        final boolean isAlias = composedSchema.getOneOf() != null && !composedSchema.getOneOf().isEmpty()
                || composedSchema.getAnyOf() != null && !composedSchema.getAnyOf().isEmpty();

        if (isAlias) {
            codegenModel.getVendorExtensions().put(CodegenConstants.IS_ALIAS_EXT_NAME, Boolean.TRUE);
            codegenModel.dataType = this.codegenConfig.getSchemaType(schema);
            this.codegenConfig.addImport(codegenModel, codegenModel.dataType);
        }
    }

}
