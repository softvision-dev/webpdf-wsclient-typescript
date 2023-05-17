package net.webpdf.codegen.names;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.models.apideclaration.Model;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class ModelName {

    private static final String GENERATOR_CONFIG = "/generator_config.json";

    private static final List<PackagePrefix> packagePrefixes = new ArrayList<>();

    private final String className;
    private String packageName = "";
    private String fileName = "";

    public ModelName(String path) {
        String className = path;
        for (PackagePrefix prefix : initPackageInfo()) {
            if (path.startsWith(prefix.getAPIPrefix())) {
                className = prefix.shallPreservePrefix(className) ?
                        className :
                        className.replace(prefix.getAPIPrefix(), "");
                this.fileName = prefix.getFileLocation();
                this.packageName = prefix.getPackageLocation();
                break;
            }
        }
        StringBuilder classNameBuilder = new StringBuilder();
        for (String part : className.split("_")) {
            classNameBuilder.append(StringUtils.capitalize(part));
        }
        this.className = classNameBuilder.toString();
    }

    private static List<PackagePrefix> initPackageInfo() {
        if (packagePrefixes.isEmpty()) {
            try (InputStream config = Model.class.getResourceAsStream(GENERATOR_CONFIG)) {
                if (config != null) {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode configNode = mapper.readTree(
                            IOUtils.toString(config, StandardCharsets.UTF_8));
                    JsonNode prefixes = configNode.at("/packages");
                    for (JsonNode prefix : prefixes) {
                        JsonNode preserve = prefix.get("preservePrefix");
                        List<String> preserveTypes = new ArrayList<>();
                        if (preserve != null) {
                            for (JsonNode node : preserve) {
                                preserveTypes.add(node.asText());
                            }
                        }
                        packagePrefixes.add(new PackagePrefix(
                                prefix.get("prefix").asText(""),
                                prefix.get("location").asText(""),
                                preserveTypes
                        ));
                    }
                }
            } catch (IOException ex) {
                // IGNORE
            }
        }
        return packagePrefixes;
    }

    public String getFileName() {
        return fileName.isEmpty() ? className : fileName + className;
    }

    public String getPackageName() {
        return packageName.isEmpty() ? className : packageName + className;
    }

    public String getClassName() {
        return className;
    }

}
