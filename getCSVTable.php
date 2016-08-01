<?php

$csvLink = $_GET['link'];
$geography = $_GET['g'];
$dataType = $_GET['dt'];
$decimalPlaces = $_GET['dp'];
$urlHost = $_GET['host'];
$includeColumns = $_GET['incl'];
$excludeColumns = $_GET['excl'];
$originalPublisher = $_GET['source'];
$showChart = $_GET['chart'];

if ($originalPublisher == "ons") {$copyright = "Source: Office for National Statistics. © Crown copyright. Published under the <a href='http://www.nationalarchives.gov.uk/doc/open-government-licence/open-government-licence.htm'>Open Government Licence</a>."; }
else if ($originalPublisher == "landregistry") {$copyright = "Source: Land Registry. © Crown copyright. Published under the <a href='http://www.nationalarchives.gov.uk/doc/open-government-licence/open-government-licence.htm'>Open Government Licence</a>."; }
else if ($originalPublisher == "opendatacommunities") {$copyright = "Source: OpenDataCommunites and Department for Communities and Local Government. © Crown copyright. Published under the <a href='http://www.nationalarchives.gov.uk/doc/open-government-licence/open-government-licence.htm'>Open Government Licence</a>."; }
else if ($originalPublisher == "ordnancesurvey") {$copyright = "Source: Ordnance Survey. © Crown copyright."; }
else if ($originalPublisher == "dcc") {$copyright = "Source: Devon County Council. Published under the <a href='http://www.nationalarchives.gov.uk/doc/open-government-licence/open-government-licence.htm'>Open Government Licence</a>."; }
else {$copyright = "Source: " . $_GET['source'];}


$row = 0;
$startCol = 0;

if (isset($_GET['geographyId']) ) {$geographies = explode(",",$_GET['geographyId']); }

if ($urlHost == 'opendatacommunities.org') {
	require ('getOpenDataCommunitiesCSV.php');
	
} else {
	//-- Load csv file --
		
	$handle = @fopen($csvLink, "r");  //open CSV file and get data one line at a time

	if ($handle) {
		$xAxisCategories = array();
		$series = array();
		$seriesNames = array();
	
		echo "<div class='box'><table cellpadding='0' cellspacing='0' border='0' class='table table-hover table-bordered' id='data-table'>";

		while (($rowArray = fgetcsv($handle, 4096)) !== false ) {
			//check if geographyId is set.  If no, display table.  If yes, check current row.
			if ($row==0 && $rowArray[0] == 'geographyId') { $startCol = 1; }
			if ($startCol == 1 && isset($_GET['geographyId']) ) {
				//--- first col is geographyId and geography is specified in URL so just display relevent rows ---
				echo "<tr>";
				if ($row == 0 ) {
					//--- do header row ---
					for ($i = $startCol; $i < count($rowArray); $i++) {
						echo "<th align='right'>" . $rowArray[$i] . "</th>";
						if ( $i> 1 ) {$xAxisCategories[] = $rowArray[$i]; } //get column heading as x axis labels
					}
				} else if ( in_array($rowArray[0],$geographies) && $row != 0) {
					echo "<tr>";
					for ($i = $startCol; $i < count($rowArray); $i++) {
						if ($i == $startCol) {$seriesNames[] = $rowArray[$i]; }	//store first entry in line as series name - ignore Devon figures
						// is item a number?
						echo "<td align='right'>";
						if (is_numeric($rowArray[$i]) ) {
							//yes, a number
							if ($decimalPlaces != "mixed") {
								echo number_format($rowArray[$i], $decimalPlaces);
							} else {
								//find number of decimal places
								$tempDecimals = $rowArray[$i] - intval($rowArray[$i]) ;
								if ( strlen($tempDecimals) < 2) {
									//no decimals
									$tempDecimals = 0;
								} else {
									$tempDecimals = strlen($tempDecimals) - 2;
								}
								echo number_format($rowArray[$i], $tempDecimals);
							}
							//  add value to chart series
							$series[$row][$i] = $rowArray[$i];
						
						} else {
						//not a number.  Just echo the variable.
							echo  $rowArray[$i];
						}
						echo "</td>";
					}
					echo "</tr>";
				}  //--- finish building table is geography is set
			} else {
				//--- just display table ---		
				echo "<tr>";
				for ($i = $startCol; $i < count($rowArray); $i++) {
				//print_r($rowArray[0]);
					if ($row == 0) {
						echo "<th align='right'>" . $rowArray[$i] . "</th>";
						if ($i != $startCol ) {$xAxisCategories[] = $rowArray[$i]; } //get column heading as x axis labels
					} else {
						if ($i == $startCol) {$seriesNames[] = $rowArray[$i]; }	//store first entry in line as series name, ignore Devon
						// is item a number?
						echo "<td align='right'>";
						if (is_numeric($rowArray[$i]) && $i != 0 ) {  //don't display column 1 ($i=0) as numeric - might be a year
							//yes, a number
							if ($decimalPlaces != "mixed") {
								echo number_format($rowArray[$i], $decimalPlaces);
							} else {
								//find number of decimal places
								$tempDecimals = $rowArray[$i] - intval($rowArray[$i]) ;
								if ( strlen($tempDecimals) < 2) {
									//no decimals
									$tempDecimals = 0;
								} else {
									$tempDecimals = strlen($tempDecimals) - 2;
								}
								echo number_format($rowArray[$i], $tempDecimals);
							}
							//add number to chart series
							$series[$row][$i] = $rowArray[$i];							
							
						} else {
							//not a number.  Just echo the variable.
							echo  $rowArray[$i];
						}
						echo "</td>";
					}
				}
				echo "</tr>";
			}
			$row++;
		}
		if (!feof($handle)) {
			echo "Error: Could not get data from file\n";
		}

	echo "</table>";
	fclose($handle);
	if ($showChart == "yes") {
?>	
<script>
jQuery(document).ready( function($) { 
    var chart1 = new Highcharts.Chart({
        chart : {
            renderTo: 'chartContainer1',
			type : "column"
        },
		title : {text : ''},
		xAxis : {
			categories: [ <?php
			foreach ($xAxisCategories as $category) {echo "'" . $category . "',";}
			?>]},
        series: [<?php
		// for each seriesName in seriesNames create a series in the chart
		$seriesDone = 1;
		foreach ($seriesNames as $seriesName) {
			echo "{name : '" . $seriesName . "', \n";
			if ($seriesDone == 1) {echo "visible : true, \n"; } else {echo "visible : false, \n"; } 
			echo "data : [";
				foreach($series[$seriesDone] as $currentValue){echo $currentValue . ", "; }
			echo "]},";
			$seriesDone++;
		}
		?>]
    });

    var chart2 = new Highcharts.Chart({
        chart : {
            renderTo: 'chartContainer2',
			type : "column"
        },
		title : {text : ''},
		seriesLen : <?php echo count($series); ?> ,
		xAxis : {
		categories: [ <?php
			foreach ($seriesNames as $seriesName) {echo "'" . $seriesName . "',";}
			?>]},
   		series: [<?php
			// for each category in xAxisCategories create a series in the chart
			$firstSeriesDone = false;
			$i=1;
			$seriesDone = 2;
			foreach ($xAxisCategories as $category) {
				echo "{name : '" . $category . "', \n";
				if ($firstSeriesDone == false) {echo "visible : true, \n"; $firstSeriesDone = true; } else {echo "visible : false, \n"; } 
				echo "data : [";
				for ($i=1; $i<count($series)+1; $i++) {
					echo $series[$i][$seriesDone] . ", ";
				}
				echo "]},\n";
				$seriesDone++;
			}
		?>]
    });

    $('#removeDevon').click(function () {
        var chart = $('#chartContainer2').highcharts(),
    	series = chart2.series[0];
        if (series.data.length) {
            chart.series[0].data[8].remove();
        }
    });
    
    document.getElementById("tab2").className = "tab-pane";
});
    
</script>

<ul id="myTab" class="nav nav-tabs">
   <li class="active">
      <a href="#tab1" data-toggle="tab">Chart 1</a>
   </li>
   <li>
   	  <a href="#tab2" data-toggle="tab">Chart 2</a>
   </li>
</ul>
<div id="myTabContent" class="tab-content">
   <div class="tab-pane active" id="tab1">
		<div id="chartContainer1" style="min-width: 310px; height: 400px; margin: 0 auto"></div>
   </div>
   <div class="tab-pane active" id="tab2" style="width: 100%">
		<div id="chartContainer2" style="min-width:310px; height: 400px; margin: 0 auto"></div>
   </div>
</div>

<?php
	}  //close if (chart==yes)

	if (isset($copyright)) {echo "<P><br>" . $copyright . "</P>"; }
	echo "<br><a href='" . $csvLink . "'>Download a CSV version of the data</a></div>";
		
	} else { echo "Couldn't load file"; }

}


?>