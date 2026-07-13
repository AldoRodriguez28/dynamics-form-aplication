import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';
import { CategoryResponse } from '../../services/response/catalog/category.response';

export class CatalogMapping {

    static MapCategoryResponseToOptionItems(response: CategoryResponse): OptionItemInterface[] {

        if (!response?.success || !Array.isArray(response.data)) {
            return [];
        }

        return response.data.map(item => ({
            value: item.category_Code,
            label: item.category_Name
        }));
    }
}
