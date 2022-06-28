const acordisXslContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:output method="html" version="1.0"
                encoding="UTF-8" indent="yes" doctype-public="-//W3C//DTD XHTML 1.1//EN"/>

    <!--setting identity transformation-->
    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="document">
            <div><xsl:apply-templates select="@*|node()"/></div>
    </xsl:template>

    <xsl:template match="document/p[@class='Type']">
        <div style="display:none;" class="ignored_from_ui">
            <xsl:apply-templates select="node()">
            </xsl:apply-templates>
        </div>
    </xsl:template>

    <xsl:template match="document/p[@class='Product_Name']">
        <h1 style="display:none;" class="ignored_from_ui">
            <xsl:apply-templates select="node()">
            </xsl:apply-templates>
        </h1>
    </xsl:template>

    <xsl:template match="document/p[@class='Ingredient Substance']">
        <p class="ingredient_substance ignored_from_ui" style="display:none;">
            <span>
                <b><xsl:value-of select="@class"/>:</b>
            </span>
            <span>
                <xsl:apply-templates select="@*|node()"></xsl:apply-templates>
            </span>
        </p>
    </xsl:template>

    <xsl:template match="document/p[@class='Read Instructions'][1]">
        <xsl:text disable-output-escaping='yes'>&lt;div class="read_instructions" style="display:none;" class="ignored_from_ui" &gt;</xsl:text>
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="document/p[@class='Read Instructions'][position()>1 and position()&lt;last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="document/p[@class='Read Instructions'][last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
        <xsl:text disable-output-escaping='yes'>&lt;/div&gt;</xsl:text>
    </xsl:template>

    <xsl:template match="document/p[@class='Table of Content'][1]">
        <xsl:text disable-output-escaping='yes'>&lt;div class="table_of_content ignored_from_ui" style="display:none;" &gt;</xsl:text>
        <h2 style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></h2>
    </xsl:template>

    <xsl:template match="document/p[@class='Table of Content'][position()>1 and position()&lt;last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="document/p[@class='Table of Content'][last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
        <xsl:text disable-output-escaping='yes'>&lt;/div&gt;</xsl:text>
    </xsl:template>
    
        <xsl:template match="document/section">
        <div class="section leaflet-accordion-item">
            <xsl:apply-templates select="header"/>
                <div class="leaflet-accordion-item-content">
                     <xsl:apply-templates select="*[not(self::header)]"/>
                </div>
        </div>
    </xsl:template>
    
    
    <xsl:template match="document/section/header">
        <h5>
            <xsl:apply-templates select="node()" />
        </h5>
    </xsl:template>

    <xsl:template match="document/section/p">
        <p><xsl:apply-templates select="node()" /></p>
    </xsl:template>
    
    <xsl:template match="//ul">
        <ul><xsl:apply-templates select="node()" /></ul>
    </xsl:template>

    <xsl:template match="//ul/li">
        <li><xsl:apply-templates select="node()" /></li>
    </xsl:template>

    <xsl:template match="//ol">
        <ol><xsl:apply-templates select="node()" /></ol>
    </xsl:template>

    <xsl:template match="//ol/li">
        <li><xsl:apply-templates select="node()" /></li>
    </xsl:template>

    <xsl:template match="//section//p">
        <p><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="//figure">
        <figure><xsl:apply-templates select="node()" /></figure>
    </xsl:template>

    <xsl:template match="//figure/p">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="//table">
        <table><xsl:apply-templates select="node()" /></table>
    </xsl:template>

    <xsl:template match="//tr">
        <tr><xsl:apply-templates select="node()" /></tr>
    </xsl:template>

</xsl:stylesheet>`;

module.exports = acordisXslContent;