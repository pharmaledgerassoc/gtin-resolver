<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:output method="html" version="1.0"
                encoding="UTF-8" indent="yes" doctype-public="-//W3C//DTD XHTML 1.1//EN"/>

    <!--setting identity transformation-->
    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="root">
        <html>
            <head>
                <title>Leaflet</title>
            </head>
            <body><xsl:apply-templates select="@*|node()"/></body>
        </html>
    </xsl:template>

    <xsl:template match="root/p[@class='Type']">
        <div style="display:none;" class="ignored_from_ui">
            <xsl:apply-templates select="node()">
            </xsl:apply-templates>
        </div>
    </xsl:template>

    <xsl:template match="root/p[@class='Product_Name']">
        <h1 style="display:none;" class="ignored_from_ui">
            <xsl:apply-templates select="node()">
            </xsl:apply-templates>
        </h1>
    </xsl:template>

    <xsl:template match="root/p[@class='Ingredient Substance']">
        <p class="ingredient_substance ignored_from_ui" style="display:none;">
            <span>
                <b><xsl:value-of select="@class"/>:</b>&#160;<xsl:apply-templates select="@*|node()"></xsl:apply-templates>
            </span>
        </p>
    </xsl:template>

    <xsl:template match="root/p[@class='Read Instructions'][1]">
        <xsl:text disable-output-escaping='yes'>&lt;div class="read_instructions" style="display:none;" class="ignored_from_ui" &gt;</xsl:text>
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="root/p[@class='Read Instructions'][position()>1 and position()&lt;last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="root/p[@class='Read Instructions'][last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
        <xsl:text disable-output-escaping='yes'>&lt;/div&gt;</xsl:text>
    </xsl:template>

    <xsl:template match="root/p[@class='Table of Content'][1]">
        <xsl:text disable-output-escaping='yes'>&lt;div class="table_of_content ignored_from_ui" style="display:none;" &gt;</xsl:text>
        <h2 style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></h2>
    </xsl:template>

    <xsl:template match="root/p[@class='Table of Content'][position()>1 and position()&lt;last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
    </xsl:template>

    <xsl:template match="root/p[@class='Table of Content'][last()]">
        <p style="display:none;" class="ignored_from_ui"><xsl:apply-templates select="node()" /></p>
        <xsl:text disable-output-escaping='yes'>&lt;/div&gt;</xsl:text>
    </xsl:template>

    <xsl:template match="root/section">
        <div class="section">
            <xsl:apply-templates select="node()" />
        </div>
    </xsl:template>

    <xsl:template match="root/section/header">
        <h1>
            <xsl:apply-templates select="node()" />
        </h1>
    </xsl:template>

    <xsl:template match="root/section/p">
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

</xsl:stylesheet>