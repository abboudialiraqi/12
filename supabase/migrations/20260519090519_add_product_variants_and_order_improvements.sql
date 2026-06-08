/*
  # تحديث المنتجات والطلبات

  1. تعديلات
    - جدول `products`: إضافة عمود `variants` لتخزين خيارات المنتج (ألوان، أحجام، إلخ)
    - جدول `order_items`: إضافة عمود `selected_options` لحفظ الخيارات التي اختارها الزبون
    - جدول `order_items`: إضافة عمود `image_url` لحفظ صورة المنتج وقت الطلب

  2. المخزن
    - إضافة trigger تلقائي: عند إدراج order_item ينقص stock المنتج
    - إضافة trigger تلقائي: عند حذف طلب يرجع stock المنتج
    - إضافة trigger تلقائي: عند إلغاء طلب (status = cancelled) يرجع stock

  3. الأمان
    - إضافة سياسة حذف الطلبات للإدمن
*/

-- إضافة عمود variants لتخزين خيارات المنتج
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'variants'
  ) THEN
    ALTER TABLE products ADD COLUMN variants jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- إضافة selected_options لحفظ خيارات الزبون
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'selected_options'
  ) THEN
    ALTER TABLE order_items ADD COLUMN selected_options jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- إضافة image_url للمنتج في وقت الطلب
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE order_items ADD COLUMN image_url text DEFAULT '';
  END IF;
END $$;

-- دالة تنقص المخزن عند إضافة order_item
CREATE OR REPLACE FUNCTION decrease_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - NEW.quantity)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger: ينقص المخزن عند إنشاء order_item
DROP TRIGGER IF EXISTS trg_decrease_stock ON order_items;
CREATE TRIGGER trg_decrease_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrease_stock_on_order();

-- دالة ترجع المخزن عند حذف order_item
CREATE OR REPLACE FUNCTION restore_stock_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = stock + OLD.quantity
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger: يرجع المخزن عند حذف order_item
DROP TRIGGER IF EXISTS trg_restore_stock_delete ON order_items;
CREATE TRIGGER trg_restore_stock_delete
  AFTER DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_delete();

-- دالة ترجع المخزن عند إلغاء الطلب
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- فقط عند التحول من حالة غير ملغاة إلى ملغاة
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE products p
    SET stock = stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  -- عند إلغاء الإلغاء (مثلاً رجع لـ pending) ينقص مجدداً
  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    UPDATE products p
    SET stock = GREATEST(0, stock - oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger: يدير المخزن عند تغيير حالة الطلب
DROP TRIGGER IF EXISTS trg_restore_stock_cancel ON orders;
CREATE TRIGGER trg_restore_stock_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_cancel();

-- سياسة حذف الطلبات للإدمن (service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Admin can delete orders'
  ) THEN
    CREATE POLICY "Admin can delete orders"
      ON orders FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- سياسة حذف order_items للإدمن
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_items' AND policyname = 'Admin can delete order items'
  ) THEN
    CREATE POLICY "Admin can delete order items"
      ON order_items FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;
