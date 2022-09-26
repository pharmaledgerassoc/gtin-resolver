const acordisXslContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="urn:hl7-org:v3"
                xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="urn:hl7-org:v3 https://www.accessdata.fda.gov/spl/schema/spl.xsd">

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
    
    <xsl:param name="quote">"</xsl:param>
    <xsl:param name="space">\\0020</xsl:param>
    <xsl:template match="//ul">
        <ul>
          <xsl:attribute name="style"> list-style-type: <xsl:value-of select="$quote"/><xsl:value-of select="@data-type"/><xsl:value-of select="$space"/><xsl:value-of select="$quote"/>;
          </xsl:attribute>
        <xsl:apply-templates select="node()" /></ul>
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

    <xsl:template match="//figure/*[not(self::img)]">
        <section style="display:none;" class="ignore_from_ui"><xsl:apply-templates select="node()" /></section>
    </xsl:template>
    
    
    <xsl:template match="//figure/img">
        <xsl:variable name="_src">
            <xsl:value-of select="@src"/>
        </xsl:variable>
        <img>
            <xsl:attribute name="src">
                <xsl:value-of select="concat($resources_path, $_src)"/>
            </xsl:attribute>
            <xsl:apply-templates select="node()"/>
        </img>
    </xsl:template>
    
    <xsl:template match="//table">
        <table><xsl:apply-templates select="node()" /></table>
    </xsl:template>

    <xsl:template match="//tr">
        <tr><xsl:apply-templates select="node()" /></tr>
    </xsl:template>
      
     <xsl:template match="//*[@class='Table of Content']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
    
      <xsl:template match="//*[@class='Type']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
   
    <xsl:template match="//*[@class='Product_Name']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
   <xsl:template match="//*[@class='Ingredient Substance']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
   <xsl:template match="//*[@class='Read Instructions']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
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
</xsl:stylesheet>`;

module.exports = acordisXslContent;
