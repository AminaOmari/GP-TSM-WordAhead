import csv
import io
import os

class DataManager:
    """
    Handles generation of sample survey response data for importing to Qualtrics,
    as well as parsing and calculating advanced statistics on exported results.
    """

    @staticmethod
    def generate_sample_responses(file_path: str) -> str:
        """
        Generates a clean local CSV file containing sample customer feedback responses,
        which can be imported into Qualtrics. Returns the file path.
        """
        # Define the headers and sample rows.
        # This matches the basic structure needed for importing survey data.
        headers = ["ResponseId", "QID1_NPS", "QID2_Product", "QID3_Support", "QID4_Feedback", "QID5_Country"]
        
        sample_rows = [
            ["R_01", "10", "5", "5", "Absolutely amazing! Outstanding customer support.", "USA"],
            ["R_02", "8", "4", "4", "Good experience, but the pricing is a bit high.", "Israel"],
            ["R_03", "5", "2", "3", "Support was decent, but product itself is buggy.", "Germany"],
            ["R_04", "9", "5", "4", "Great job, very satisfied.", "USA"],
            ["R_05", "6", "3", "2", "Slow responses and hard to navigate website.", "UK"],
            ["R_06", "10", "5", "5", "Fantastic service! Highly recommended!", "Israel"],
            ["R_07", "7", "4", "3", "Average experience. Nothing special.", "UK"],
            ["R_08", "3", "1", "2", "Terrible customer support. Will cancel soon.", "Germany"],
            ["R_09", "9", "5", "5", "Loved everything about it. Keep it up!", "Israel"],
            ["R_10", "8", "4", "4", "Solid product with good features.", "USA"]
        ]

        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        
        with open(file_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(sample_rows)

        return file_path

    @staticmethod
    def get_simulated_export_csv() -> str:
        """
        Returns a string formatted as a standard Qualtrics response export.
        Qualtrics response exports consist of a unique 3-row header:
          Row 1: Question key names (e.g., ResponseId, QID1, QID2...)
          Row 2: Full question text descriptions
          Row 3: Import metadata JSON objects
        Followed by rows containing the actual responses.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Row 1: Header names
        writer.writerow(["ResponseId", "QID1", "QID2", "QID3", "QID4", "QID5"])
        # Row 2: Question texts
        writer.writerow([
            "Response ID", 
            "How likely are you to recommend us? (NPS)", 
            "Rate our Product Quality", 
            "Rate our Customer Support", 
            "Provide any additional feedback", 
            "Respondent Country"
        ])
        # Row 3: Import IDs
        writer.writerow([
            '{"ImportId":"ResponseID"}',
            '{"ImportId":"QID1"}',
            '{"ImportId":"QID2"}',
            '{"ImportId":"QID3"}',
            '{"ImportId":"QID4"}',
            '{"ImportId":"QID5"}'
        ])
        
        # Rows 4+: Responses
        responses = [
            ["R_01", "10", "5", "5", "Absolutely amazing! Outstanding customer support.", "USA"],
            ["R_02", "8", "4", "4", "Good experience, but the pricing is a bit high.", "Israel"],
            ["R_03", "5", "2", "3", "Support was decent, but product itself is buggy.", "Germany"],
            ["R_04", "9", "5", "4", "Great job, very satisfied.", "USA"],
            ["R_05", "6", "3", "2", "Slow responses and hard to navigate website.", "UK"],
            ["R_06", "10", "5", "5", "Fantastic service! Highly recommended!", "Israel"],
            ["R_07", "7", "4", "3", "Average experience. Nothing special.", "UK"],
            ["R_08", "3", "1", "2", "Terrible customer support. Will cancel soon.", "Germany"],
            ["R_09", "9", "5", "5", "Loved everything about it. Keep it up!", "Israel"],
            ["R_10", "8", "4", "4", "Solid product with good features.", "USA"]
        ]
        writer.writerows(responses)
        return output.getvalue()

    @classmethod
    def analyze_results(cls, csv_content: str) -> dict:
        """
        Parses Qualtrics 3-row header response CSV data and calculates:
        - Total Response Count
        - Net Promoter Score (NPS) distribution and score
        - Average Product and Support Satisfaction ratings
        - Aggregated breakdown per Country cohort
        - Qualtrics open-ended feedback comments
        """
        # Use io.StringIO to read string content as a file
        csv_file = io.StringIO(csv_content.strip())
        reader = list(csv.reader(csv_file))
        
        if len(reader) <= 3:
            return {"error": "Empty or invalid CSV file received."}
            
        # Parse headers and question labels
        headers = reader[0]
        questions = reader[1]
        
        # Row 4 onwards contains the real responses
        data_rows = reader[3:]
        
        total_responses = len(data_rows)
        
        # We map columns based on headers. Standard columns:
        # QID1 -> NPS, QID2 -> Product, QID3 -> Support, QID4 -> Feedback, QID5 -> Country
        col_nps = headers.index("QID1") if "QID1" in headers else 1
        col_prod = headers.index("QID2") if "QID2" in headers else 2
        col_supp = headers.index("QID3") if "QID3" in headers else 3
        col_feed = headers.index("QID4") if "QID4" in headers else 4
        col_cntry = headers.index("QID5") if "QID5" in headers else 5

        promoters = 0
        passives = 0
        detractors = 0
        
        product_sum = 0
        product_count = 0
        support_sum = 0
        support_count = 0
        
        feedbacks = []
        
        # Country specific analytics cohort
        country_data = {}

        for row in data_rows:
            if not row or len(row) <= max(col_nps, col_prod, col_supp, col_feed, col_cntry):
                continue
                
            # Extract and calculate NPS
            try:
                nps_val = int(row[col_nps])
                if nps_val >= 9:
                    promoters += 1
                elif nps_val >= 7:
                    passives += 1
                else:
                    detractors += 1
            except ValueError:
                nps_val = None
                
            # Extract Product Rating
            try:
                prod_val = float(row[col_prod])
                product_sum += prod_val
                product_count += 1
            except ValueError:
                prod_val = None

            # Extract Support Rating
            try:
                supp_val = float(row[col_supp])
                support_sum += supp_val
                support_count += 1
            except ValueError:
                supp_val = None

            # Extract feedback comment
            feedback_text = row[col_feed].strip()
            if feedback_text:
                feedbacks.append(feedback_text)
                
            # Country segmentation group
            country = row[col_cntry].strip() or "Unknown"
            if country not in country_data:
                country_data[country] = {
                    "count": 0,
                    "nps_list": [],
                    "product_list": [],
                    "support_list": []
                }
            
            country_data[country]["count"] += 1
            if nps_val is not None:
                country_data[country]["nps_list"].append(nps_val)
            if prod_val is not None:
                country_data[country]["product_list"].append(prod_val)
            if supp_val is not None:
                country_data[country]["support_list"].append(supp_val)

        # NPS Score calculations
        nps_score = 0.0
        promoter_pct = 0.0
        passive_pct = 0.0
        detractor_pct = 0.0
        
        if total_responses > 0:
            promoter_pct = (promoters / total_responses) * 100
            passive_pct = (passives / total_responses) * 100
            detractor_pct = (detractors / total_responses) * 100
            nps_score = promoter_pct - detractor_pct

        avg_product = product_sum / product_count if product_count > 0 else 0.0
        avg_support = support_sum / support_count if support_count > 0 else 0.0

        # Process Country Cohorts
        country_report = {}
        for c, details in country_data.items():
            cnt = details["count"]
            
            # Segment NPS calculation
            c_prom = sum(1 for x in details["nps_list"] if x >= 9)
            c_det = sum(1 for x in details["nps_list"] if x <= 6)
            c_nps_len = len(details["nps_list"])
            c_nps = ((c_prom - c_det) / c_nps_len * 100) if c_nps_len > 0 else 0.0
            
            # Segment CSAT averages
            c_prod = sum(details["product_list"]) / len(details["product_list"]) if details["product_list"] else 0.0
            c_supp = sum(details["support_list"]) / len(details["support_list"]) if details["support_list"] else 0.0
            
            country_report[c] = {
                "Count": cnt,
                "NPS": round(c_nps, 1),
                "Avg Product Quality": round(c_prod, 2),
                "Avg Customer Support": round(c_supp, 2)
            }

        return {
            "total_responses": total_responses,
            "nps": {
                "score": round(nps_score, 1),
                "promoters_count": promoters,
                "promoters_percent": round(promoter_pct, 1),
                "passives_count": passives,
                "passives_percent": round(passive_pct, 1),
                "detractors_count": detractors,
                "detractors_percent": round(detractor_pct, 1),
            },
            "averages": {
                "product_quality": round(avg_product, 2),
                "customer_support": round(avg_support, 2),
            },
            "countries": country_report,
            "feedbacks": feedbacks,
            "questions": {
                "nps": questions[col_nps],
                "product": questions[col_prod],
                "support": questions[col_supp],
                "feedback": questions[col_feed]
            }
        }
